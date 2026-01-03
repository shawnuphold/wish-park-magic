import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { downloadAndStoreImage } from '../src/lib/images/releaseImages';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Map of item titles to working image URLs from RSS
const imageFixMap: Record<string, string> = {
  'Cinderella Castle Ear Headband': 'https://media.wdwnt.com/2025/12/wdw-dhs-keystone-clothiers-glittery-gold-cinderella-castle-ear-headband-1-edited.jpg',
  'World of Disney T-Shirt': 'https://media.wdwnt.com/2025/12/wdw-ds-wod-merch-1.jpg',
  'Stylized Park Icon Ear Headband': 'https://media.wdwnt.com/2025/12/wdw-stylized-park-icons-ear-headband-2-edited.jpg',
  'Hundred Acre Wood Zip-Up Jacket': 'https://media.wdwnt.com/2025/12/wdw-haw-hoodie-front.jpg',
};

async function fixImages() {
  // Find all items with WDWNT image URLs that are likely blocked
  const { data: items } = await supabase
    .from('new_releases')
    .select('id, title, image_url')
    .like('image_url', '%media.wdwnt.com%');

  if (!items || items.length === 0) {
    console.log('No WDWNT image URLs found');
    return;
  }

  console.log(`Found ${items.length} items with WDWNT image URLs\n`);

  for (const item of items) {
    console.log(`Processing: ${item.title}`);
    console.log(`  Current URL: ${item.image_url}`);

    // Check if we have a mapped replacement URL for this item
    let sourceUrl = item.image_url;
    for (const [titleMatch, replacementUrl] of Object.entries(imageFixMap)) {
      if (item.title.includes(titleMatch)) {
        console.log(`  Using mapped URL: ${replacementUrl}`);
        sourceUrl = replacementUrl;
        break;
      }
    }

    try {
      // Download and store to S3
      const s3Url = await downloadAndStoreImage(sourceUrl, item.id, 'blog');

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

fixImages();
