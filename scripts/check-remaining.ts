import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  const { data } = await supabase
    .from('new_releases')
    .select('id, title, image_url, source_url')
    .like('image_url', '%media.wdwnt.com%');

  console.log('Remaining items with WDWNT URLs:');
  for (const item of data || []) {
    console.log('---');
    console.log('Title:', item.title);
    console.log('Image:', item.image_url);
    console.log('Source:', item.source_url);
    console.log('ID:', item.id);
  }
}
check();
