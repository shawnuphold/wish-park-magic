import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// IDs of items with permanently blocked WDWNT images
const blockedIds = [
  '36a46987-e30e-470f-813e-d272230ec68c', // Gabby's Dollhouse Light-Up Hat
  '18f1386d-156a-4dfc-b0eb-d4f08a53c2e6', // Sorcery Mickey Coffee Mug
  'f6f279b8-cd5a-4ca3-949c-507c5d3b1dab', // Universal Orlando Resort Reusable Shopping Bag - Small
  'b8dc068c-87f6-4337-863e-98f1addf709c', // Universal Orlando Resort Reusable Shopping Bag - Large
];

async function clearBlockedImages() {
  for (const id of blockedIds) {
    const { data: item } = await supabase
      .from('new_releases')
      .select('title')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('new_releases')
      .update({ image_url: '/placeholder.svg' })
      .eq('id', id);

    if (error) {
      console.log(`✗ Failed to clear ${item?.title}: ${error.message}`);
    } else {
      console.log(`✓ Cleared blocked image for: ${item?.title}`);
    }
  }
}

clearBlockedImages();
