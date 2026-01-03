import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Items that are online-only (shopDisney exclusive) - not available in parks
const onlineOnlyTitles = [
  'Bambi Ear Headband', // shopDisney exclusive
];

async function deleteOnlineOnly() {
  console.log('Looking for online-only items to remove...\n');

  for (const title of onlineOnlyTitles) {
    const { data, error } = await supabase
      .from('new_releases')
      .delete()
      .ilike('title', `%${title}%`)
      .select();

    if (error) {
      console.log(`Error deleting "${title}":`, error.message);
    } else if (data && data.length > 0) {
      for (const item of data) {
        console.log(`Deleted: ${item.title}`);
      }
    } else {
      console.log(`Not found: ${title}`);
    }
  }

  console.log('\nDone!');
}

deleteOnlineOnly();
