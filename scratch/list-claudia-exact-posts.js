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

const CLIENT_ID = '599e41ac-8a09-4f68-83ec-a5cb126f178b';
const FOLDER_PATH = 'C:\\Users\\Diego G. Damacena\\Downloads\\Claudia Rangel Podologa';

async function main() {
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('id, content, media_urls, status, scheduled_for, published_at')
    .eq('client_id', CLIENT_ID);

  console.log(`TOTAL DE POSTS PARA CLAUDIA RANGEL: ${posts.length}`);
  posts.forEach((p, idx) => {
    console.log(`\n--- POST ${idx + 1} (${p.status}) ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Data: ${p.published_at || p.scheduled_for}`);
    console.log(`Texto: ${p.content ? p.content.slice(0, 90).replace(/\n/g, ' ') : ''}`);
    console.log(`Mídias (${(p.media_urls || []).length}):`, p.media_urls);
  });
}

main().catch(console.error);

