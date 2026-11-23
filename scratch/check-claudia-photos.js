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

async function main() {
  const { data: photos } = await supabase
    .from('photos')
    .select('id, category, url, google_url, created_at')
    .eq('client_id', CLIENT_ID);

  console.log(`PHOTOS IN DB (${photos.length}):`);
  photos.forEach(p => console.log(p.created_at, p.category, p.url?.slice(0, 75)));
}

main().catch(console.error);

