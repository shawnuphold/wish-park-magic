#!/usr/bin/env npx tsx
/**
 * Test smart cropping on a composite image
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { analyzeCompositeImage, cropImageRegion } from '../src/lib/images/smartCropper';
import { uploadBufferToS3 } from '../src/lib/images/releaseImages';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get the Robin Hood Title T-Shirt image
  const { data: release } = await supabase
    .from('new_releases')
    .select('id, title, image_url')
    .eq('title', 'Robin Hood Title T-Shirt')
    .single();

  if (!release || !release.image_url) {
    console.log('Release not found or no image');
    return;
  }

  console.log(`Testing smart crop on: ${release.title}`);
  console.log(`Image: ${release.image_url}\n`);

  // Product names we're looking for (from the article)
  const productNames = [
    'Robin Hood Movie Poster T-Shirt',
    'Robin Hood Characters T-Shirt',
    'Meet Robin Hood T-Shirt'
  ];

  // Analyze the image
  const analysis = await analyzeCompositeImage(release.image_url, productNames);

  console.log('\nAnalysis Result:');
  console.log(`  Is Composite: ${analysis.isComposite}`);
  console.log(`  Products Found: ${analysis.products.length}`);

  if (analysis.products.length > 0) {
    console.log('\nProducts identified:');
    for (const product of analysis.products) {
      console.log(`\n  📦 ${product.productName}`);
      console.log(`     ${product.description}`);
      console.log(`     Region: x=${product.x}%, y=${product.y}%, ${product.width}%x${product.height}%`);

      // Try to crop
      const cropped = await cropImageRegion(release.image_url, product);
      if (cropped) {
        console.log(`     ✅ Cropped successfully (${cropped.length} bytes)`);

        // Upload the cropped image (for testing)
        const testId = `test-crop-${Date.now()}`;
        const s3Url = await uploadBufferToS3(cropped, testId);
        if (s3Url) {
          console.log(`     📤 Uploaded: ${s3Url}`);
        }
      } else {
        console.log(`     ❌ Failed to crop`);
      }
    }
  }
}

main();
