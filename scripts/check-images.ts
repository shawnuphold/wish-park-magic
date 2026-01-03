import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data } = await supabase.from('new_releases').select('id, title, image_url, source_url, created_at').order('created_at', { ascending: false }).limit(20);
  if (data) {
    console.log('Recent releases:');
    for (const r of data) {
      const hasImg = r.image_url && r.image_url.length > 5 ? '✓' : '✗';
      const name = r.title || 'Unknown';
      console.log(hasImg + ' ' + name.substring(0, 55));
      if (!r.image_url || r.image_url.length < 5) {
        const src = r.source_url || 'No source';
        console.log('   Source: ' + src.substring(0, 70));
        console.log('   ID: ' + r.id);
      }
    }
  }
}
main();
