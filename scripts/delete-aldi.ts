import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function deleteItems() {
  const idsToDelete = [
    '2f1f9ebc-6f80-4e59-87e3-4bd9630a30ce', // Folding Utility Cart
    'a2b390eb-0e2b-4c91-9ba9-407b4271933d', // Storage Boxes Set
    '5093429a-caa2-4b8b-b944-604cd4f30451', // Travel Snack Containers
  ];
  
  const { error } = await supabase
    .from('new_releases')
    .delete()
    .in('id', idsToDelete);
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Deleted 3 Aldi items');
  }
}
deleteItems();
