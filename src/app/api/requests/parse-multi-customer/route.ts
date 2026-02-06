import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseMultiCustomerScreenshot, type MultiCustomerParseResult, type MultiCustomerRequest } from '@/lib/ai/parseScreenshot';
import { requireAdminAuth } from '@/lib/auth/api-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface CustomerMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  match_score: number; // 0-100
  match_reason: string;
}

interface EnrichedCustomerRequest extends MultiCustomerRequest {
  customer_matches: CustomerMatch[];
}

interface EnrichedParseResult {
  success: boolean;
  is_multi_customer: boolean;
  customers: EnrichedCustomerRequest[];
  raw_text: string | null;
  error: string | null;
}

// Find matching customers in the database
async function findCustomerMatches(
  customerName: string,
  customerIdentifier: string | null
): Promise<CustomerMatch[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const matches: CustomerMatch[] = [];

  // Normalize name for matching
  const nameParts = customerName.toLowerCase().trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  // Search by exact name match
  const { data: exactMatches } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .ilike('name', `%${customerName}%`)
    .limit(5);

  if (exactMatches) {
    for (const c of exactMatches) {
      const score = c.name.toLowerCase() === customerName.toLowerCase() ? 100 : 85;
      matches.push({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        match_score: score,
        match_reason: score === 100 ? 'Exact name match' : 'Partial name match'
      });
    }
  }

  // Search by first name + last name
  if (nameParts.length >= 2 && matches.length < 3) {
    const { data: partialMatches } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .or(`name.ilike.%${firstName}%,name.ilike.%${lastName}%`)
      .limit(10);

    if (partialMatches) {
      for (const c of partialMatches) {
        // Avoid duplicates
        if (matches.some(m => m.id === c.id)) continue;

        const cNameLower = c.name.toLowerCase();
        const hasFirst = cNameLower.includes(firstName);
        const hasLast = cNameLower.includes(lastName);

        if (hasFirst && hasLast) {
          matches.push({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            match_score: 75,
            match_reason: 'First and last name match'
          });
        } else if (hasFirst || hasLast) {
          matches.push({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            match_score: 50,
            match_reason: hasFirst ? 'First name match' : 'Last name match'
          });
        }
      }
    }
  }

  // Search by identifier (email, phone, username)
  if (customerIdentifier && matches.length < 3) {
    const identifier = customerIdentifier.replace(/[@+\s]/g, '').toLowerCase();

    const { data: identifierMatches } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .or(`email.ilike.%${identifier}%,phone.ilike.%${identifier}%`)
      .limit(5);

    if (identifierMatches) {
      for (const c of identifierMatches) {
        if (matches.some(m => m.id === c.id)) continue;

        matches.push({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          match_score: 90,
          match_reason: 'Email/phone match'
        });
      }
    }
  }

  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);
}

export async function POST(request: NextRequest): Promise<NextResponse<EnrichedParseResult>> {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response as NextResponse<EnrichedParseResult>;

  try {
    const contentType = request.headers.get('content-type') || '';

    let imageBase64: string;
    let mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';

    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({
          success: false,
          is_multi_customer: false,
          customers: [],
          raw_text: null,
          error: 'No file provided'
        }, { status: 400 });
      }

      if (!SUPPORTED_TYPES.includes(file.type)) {
        return NextResponse.json({
          success: false,
          is_multi_customer: false,
          customers: [],
          raw_text: null,
          error: `Unsupported file type: ${file.type}`
        }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          success: false,
          is_multi_customer: false,
          customers: [],
          raw_text: null,
          error: 'File too large (max 10MB)'
        }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      mimeType = file.type as typeof mimeType;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body.image) {
        return NextResponse.json({
          success: false,
          is_multi_customer: false,
          customers: [],
          raw_text: null,
          error: 'No image provided'
        }, { status: 400 });
      }

      // Extract mime type from data URL prefix if present (authoritative source)
      const dataUrlMatch = body.image.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,/);
      if (dataUrlMatch) {
        // Normalize jpeg variants
        let detectedType = dataUrlMatch[1].toLowerCase();
        if (detectedType === 'image/jpg') {
          detectedType = 'image/jpeg';
        }
        // Only use if it's a supported type
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(detectedType)) {
          mimeType = detectedType as typeof mimeType;
        }
        // Strip the data URL prefix to get raw base64
        imageBase64 = body.image.replace(/^data:[^;]+;base64,/, '');
      } else {
        // No data URL prefix - use raw base64 and fall back to explicit mimeType
        imageBase64 = body.image;
        // Use explicit mimeType if provided and valid
        if (body.mimeType && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(body.mimeType)) {
          mimeType = body.mimeType;
        }
      }
    } else {
      return NextResponse.json({
        success: false,
        is_multi_customer: false,
        customers: [],
        raw_text: null,
        error: 'Unsupported content type'
      }, { status: 400 });
    }

    // Parse the screenshot
    const parseResult = await parseMultiCustomerScreenshot(imageBase64, mimeType);

    if (!parseResult.success) {
      return NextResponse.json({
        ...parseResult,
        customers: []
      });
    }

    // Enrich each customer with database matches
    const enrichedCustomers: EnrichedCustomerRequest[] = await Promise.all(
      parseResult.customers.map(async (customer) => {
        const matches = await findCustomerMatches(
          customer.customer_name,
          customer.customer_identifier
        );

        return {
          ...customer,
          customer_matches: matches
        };
      })
    );

    return NextResponse.json({
      success: true,
      is_multi_customer: parseResult.is_multi_customer,
      customers: enrichedCustomers,
      raw_text: parseResult.raw_text,
      error: null
    });

  } catch (error) {
    console.error('Error in parse-multi-customer API:', error);
    return NextResponse.json({
      success: false,
      is_multi_customer: false,
      customers: [],
      raw_text: null,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  return NextResponse.json({
    endpoint: '/api/requests/parse-multi-customer',
    description: 'Parse customer message screenshots that may contain multiple customers, with automatic customer database matching',
    methods: {
      POST: {
        accepts: ['multipart/form-data (file)', 'application/json (image base64)'],
        returns: {
          success: 'boolean',
          is_multi_customer: 'boolean - whether multiple customers were detected',
          customers: [{
            customer_name: 'Name from screenshot',
            customer_identifier: 'Email/phone/username if visible',
            customer_matches: [{
              id: 'Database customer ID',
              name: 'Database customer name',
              email: 'Email if available',
              match_score: '0-100 confidence',
              match_reason: 'Why this was matched'
            }],
            items: 'Array of requested items',
            park_preference: 'Preferred park',
            urgency: 'low|normal|high|urgent',
            notes: 'Additional notes'
          }],
          raw_text: 'Extracted text from screenshot',
          error: 'Error message if failed'
        }
      }
    }
  });
}
