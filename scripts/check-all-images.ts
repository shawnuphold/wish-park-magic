import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkAll() {
  const { data } = await supabase
    .from('new_releases')
    .select('id, title, image_url, source_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (data) {
    console.log('Recent 50 releases:');
    let missing = 0;
    for (const r of data) {
      const hasValidImg = r.image_url && r.image_url.length > 10 && r.image_url.startsWith('http');
      const status = hasValidImg ? '✓' : '✗';
      if (hasValidImg === false) missing++;
      console.log(status + ' ' + (r.title || 'Unknown').substring(0, 55));
      if (hasValidImg === false) {
        console.log('   img_url:', JSON.stringify(r.image_url));
        console.log('   source:', r.source_url ? r.source_url.substring(0, 60) : 'none');
        console.log('   id:', r.id);
      }
    }
    console.log('\nTotal missing:', missing);
  }
}
checkAll();
