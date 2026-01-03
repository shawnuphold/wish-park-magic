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
    '0b6cd999-b7a7-4bf8-8751-5adc390a17ca', // Silicone Reusable Straws
    '2ab56760-00f9-4166-b8ca-1fbf34acb64a', // Curly Reusable Straws  
    '096f8f87-832c-454a-8600-aaa3e15559b9', // Clear Glass Reusable Straws
  ];
  
  const { error } = await supabase
    .from('new_releases')
    .delete()
    .in('id', idsToDelete);
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Deleted 3 straw items');
  }
}
deleteItems();
