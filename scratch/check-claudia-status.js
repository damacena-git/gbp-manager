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
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', CLIENT_ID)
    .single();

  if (cErr) {
    console.error('Client err:', cErr);
    return;
  }

  console.log('CLIENTE CLAUDIA RANGEL:');
  console.log({
    id: client.id,
    business_name: client.business_name,
    category: client.category,
    google_account_id: client.google_account_id,
    google_location_id: client.google_location_id,
    has_refresh_token: Boolean(client.refresh_token),
    phone: client.phone,
    website: client.website,
    address: client.address
  });

  const { data: posts, error: pErr } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('client_id', CLIENT_ID)
    .order('created_at', { ascending: false });

  console.log(`\nTOTAL DE POSTS NO BANCO (${posts ? posts.length : 0}):`);
  if (posts && posts.length > 0) {
    posts.forEach(p => {
      console.log({
        id: p.id,
        status: p.status,
        scheduled_for: p.scheduled_for,
        published_at: p.published_at,
        media_urls: p.media_urls,
        preview: p.content ? p.content.slice(0, 80).replace(/\n/g, ' ') : 'sem texto'
      });
    });
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('client_id', CLIENT_ID);

  console.log(`\nTOTAL DE FOTOS NO BANCO (${photos ? photos.length : 0})`);
}

main().catch(console.error);

