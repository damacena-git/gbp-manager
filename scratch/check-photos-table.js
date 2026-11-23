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
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('client_id', CLIENT_ID);

  console.log('PHOTOS IN DB FOR CLIENT:');
  photos.forEach(p => {
    console.log({
      id: p.id,
      category: p.category,
      created_at: p.created_at,
      url: p.url?.slice(0, 80),
      google_url: p.google_url?.slice(0, 80),
      description: p.description || p.caption
    });
  });
}

main().catch(console.error);

