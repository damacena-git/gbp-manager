const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val.trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CLIENT_ID = '41659399-9597-4701-adc1-3947a94eaa6f';

async function main() {
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('id, content, media_urls, status, scheduled_for, published_at')
    .eq('client_id', CLIENT_ID);

  console.log('--- TODOS OS POSTS PUBLICADOS (TOTAL:', posts.filter(p=>p.status==='published').length, ') ---');
  posts.filter(p => p.status === 'published').forEach(p => {
    console.log(`\nID: ${p.id}`);
    console.log(`Data: ${p.published_at || p.scheduled_for}`);
    console.log(`Preview: ${p.content ? p.content.slice(0, 100).replace(/\n/g, ' ') : 'sem texto'}`);
    console.log(`Mídias (${(p.media_urls||[]).length}):`, p.media_urls);
  });
}
main().catch(console.error);

