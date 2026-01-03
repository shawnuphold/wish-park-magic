/**
 * Import customers from Pirate Ship Transactions.xlsx
 *
 * Usage:
 *   npx tsx scripts/import-pirateship-customers.ts --dry-run    # Preview only
 *   npx tsx scripts/import-pirateship-customers.ts              # Actually import
 *
 * Data source: Transactions.xlsx in project root
 * - Filters for Type="Label" rows
 * - Extracts customer name from Description: "Name: 1 Label Batch"
 * - Skips duplicates (case-insensitive match on name)
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Parse args
const isDryRun = process.argv.includes('--dry-run');

interface TransactionRow {
  Date: string;
  Type: string;
  Description: string;
  Total: string;
  Balance: string;
}

interface ImportResult {
  totalLabelRows: number;
  uniqueNamesFound: number;
  existingCustomers: number;
  skippedDuplicates: number;
  imported: number;
  errors: string[];
  importedNames: string[];
  skippedNames: string[];
}

/**
 * Convert name to Title Case, handling edge cases
 */
function toTitleCase(name: string): string {
  return name
    .trim()
    // Remove trailing numbers (e.g., "Alyssa Carey12" -> "Alyssa Carey")
    .replace(/\d+$/, '')
    .trim()
    // Split on spaces, capitalize each word
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a placeholder email from name
 * Format: firstname.lastname@imported.local
 */
function generatePlaceholderEmail(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('.');

  // Add timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36);
  return `${normalized}.${timestamp}@imported.local`;
}

async function importCustomers(): Promise<ImportResult> {
  const result: ImportResult = {
    totalLabelRows: 0,
    uniqueNamesFound: 0,
    existingCustomers: 0,
    skippedDuplicates: 0,
    imported: 0,
    errors: [],
    importedNames: [],
    skippedNames: []
  };

  // 1. Read Excel file
  const excelPath = path.join(__dirname, '..', 'Transactions.xlsx');
  console.log(`\nReading: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: TransactionRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`Total rows in Excel: ${data.length}`);

  // 2. Filter Label rows and extract names
  const labelRows = data.filter(row => row.Type === 'Label');
  result.totalLabelRows = labelRows.length;
  console.log(`Label rows found: ${result.totalLabelRows}`);

  const nameRegex = /^(.+?):\s*\d+\s*Label\s*Batch/i;
  const uniqueNames = new Map<string, string>(); // lowercase -> title case

  for (const row of labelRows) {
    const match = row.Description.match(nameRegex);
    if (match) {
      const rawName = match[1].trim();
      const titleCaseName = toTitleCase(rawName);
      const lowerKey = titleCaseName.toLowerCase();

      // Keep first occurrence (preserves any intentional case)
      if (!uniqueNames.has(lowerKey)) {
        uniqueNames.set(lowerKey, titleCaseName);
      }
    }
  }

  result.uniqueNamesFound = uniqueNames.size;
  console.log(`Unique customer names: ${result.uniqueNamesFound}`);

  // 3. Fetch existing customers from database
  console.log('\nFetching existing customers from database...');
  const { data: existingCustomers, error: fetchError } = await supabase
    .from('customers')
    .select('id, name, email');

  if (fetchError) {
    console.error('Error fetching existing customers:', fetchError);
    process.exit(1);
  }

  result.existingCustomers = existingCustomers?.length || 0;
  console.log(`Existing customers in database: ${result.existingCustomers}`);

  // Create lookup set (lowercase names)
  const existingNamesLower = new Set(
    (existingCustomers || []).map(c => c.name.toLowerCase())
  );

  // 4. Determine which names to import
  const namesToImport: string[] = [];

  for (const [lowerKey, titleCaseName] of uniqueNames) {
    if (existingNamesLower.has(lowerKey)) {
      result.skippedDuplicates++;
      result.skippedNames.push(titleCaseName);
    } else {
      namesToImport.push(titleCaseName);
    }
  }

  console.log(`\nNames to import: ${namesToImport.length}`);
  console.log(`Duplicates to skip: ${result.skippedDuplicates}`);

  // 5. Show preview
  console.log('\n========== IMPORT PREVIEW ==========\n');

  if (namesToImport.length > 0) {
    console.log('NEW CUSTOMERS TO IMPORT:');
    namesToImport.slice(0, 30).forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
    if (namesToImport.length > 30) {
      console.log(`  ... and ${namesToImport.length - 30} more`);
    }
  }

  if (result.skippedNames.length > 0) {
    console.log('\nSKIPPED (already exist):');
    result.skippedNames.slice(0, 10).forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
    if (result.skippedNames.length > 10) {
      console.log(`  ... and ${result.skippedNames.length - 10} more`);
    }
  }

  // 6. If dry-run, stop here
  if (isDryRun) {
    console.log('\n========== DRY RUN MODE ==========');
    console.log('No changes made to database.');
    console.log(`Would import ${namesToImport.length} new customers.`);
    console.log('\nRun without --dry-run to import.\n');
    return result;
  }

  // 7. Actually import
  console.log('\n========== IMPORTING ==========\n');

  // Batch insert for efficiency
  const customersToInsert = namesToImport.map(name => ({
    name,
    email: generatePlaceholderEmail(name),
    country: 'US',
    notes: 'Imported from Pirate Ship on ' + new Date().toISOString().split('T')[0]
  }));

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < customersToInsert.length; i += batchSize) {
    const batch = customersToInsert.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(customersToInsert.length / batchSize);

    console.log(`Inserting batch ${batchNum}/${totalBatches} (${batch.length} customers)...`);

    const { data: inserted, error: insertError } = await supabase
      .from('customers')
      .insert(batch)
      .select('id, name');

    if (insertError) {
      console.error(`Error inserting batch ${batchNum}:`, insertError);
      result.errors.push(`Batch ${batchNum}: ${insertError.message}`);
    } else {
      result.imported += inserted?.length || 0;
      result.importedNames.push(...(inserted?.map(c => c.name) || []));
    }
  }

  // 8. Final report
  console.log('\n========== IMPORT COMPLETE ==========\n');
  console.log(`Total Label rows processed: ${result.totalLabelRows}`);
  console.log(`Unique names found: ${result.uniqueNamesFound}`);
  console.log(`Already in database: ${result.skippedDuplicates}`);
  console.log(`Successfully imported: ${result.imported}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  return result;
}

// Run
importCustomers()
  .then(result => {
    if (!isDryRun && result.imported > 0) {
      console.log('\n✅ Import successful!');
    }
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('\nFatal error:', err);
    process.exit(1);
  });
