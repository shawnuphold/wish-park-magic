import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Titles to DELETE (keeping the better/older version)
const titlesToDelete = [
  'SpongeBob and Patrick Pirate Sipper Cups', // keep "Pirate SpongeBob and Patrick Sipper Cups"
  'Walk the Plank SpongeBob Movie Popcorn Tin', // keep "SpongeBob Walk the Plank Popcorn Tin"
  'SpongeBob and Patrick Full Figure Cups', // keep "SpongeBob and Patrick Full Body Cups"
  'SpongeBob Treasure Chest Popcorn Bucket', // keep "SpongeBob Movie Treasure Chest Popcorn Bucket"
  'Indominus Rex Bitty Chomper Figure', // keep "Indominus Rex Bitty Chomper"
  'Velociraptor Blue Bitty Chomper Figure', // keep "Velociraptor Blue Bitty Chomper"
  'Dilophosaurus Bitty Chomper Figure', // keep "Dilophosaurus Bitty Chomper"
  'Mosasaurus Bitty Chomper Figure', // keep "Mosasaurus Bitty Chomper"
];

async function deleteDuplicates() {
  for (const title of titlesToDelete) {
    const { data, error } = await supabase
      .from('new_releases')
      .delete()
      .eq('title', title)
      .select();

    if (error) {
      console.log(`Error deleting "${title}":`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Deleted: ${title}`);
    } else {
      console.log(`Not found: ${title}`);
    }
  }

  console.log('\nDone!');
}

deleteDuplicates();
