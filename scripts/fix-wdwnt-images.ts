import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { downloadAndStoreImage } from '../src/lib/images/releaseImages';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fixWdwntImages() {
  // Find all items with WDWNT image URLs
  const { data: items } = await supabase
    .from('new_releases')
    .select('id, title, image_url')
    .like('image_url', '%media.wdwnt.com%');

  if (!items || items.length === 0) {
    console.log('No WDWNT image URLs found');
    return;
  }

  console.log(`Found ${items.length} items with WDWNT image URLs to fix\n`);

  for (const item of items) {
    console.log(`Processing: ${item.title}`);
    console.log(`  Original URL: ${item.image_url}`);

    try {
      // Download and store to S3
      const s3Url = await downloadAndStoreImage(item.image_url, item.id, 'blog');

      if (s3Url) {
        // Update database with S3 URL
        const { error } = await supabase
          .from('new_releases')
          .update({ image_url: s3Url })
          .eq('id', item.id);

        if (error) {
          console.log(`  ✗ DB update failed: ${error.message}`);
        } else {
          console.log(`  ✓ Fixed: ${s3Url}`);
        }
      } else {
        console.log(`  ✗ Download failed - no S3 URL returned`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    console.log('');
  }
}

fixWdwntImages();
