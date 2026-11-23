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

async function main() {
  const clientId = '41659399-9597-4701-adc1-3947a94eaa6f';
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (cErr) {
    console.error('Client err:', cErr);
    return;
  }

  console.log('CLIENT DETAILS:');
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
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (pErr) {
    console.error('Posts err:', pErr);
  } else {
    console.log(`\nEXISTING POSTS FOR CLIENT (${posts.length}):`);
    posts.forEach(p => {
      console.log({
        id: p.id,
        status: p.status,
        scheduled_for: p.scheduled_for,
        published_at: p.published_at,
        google_post_id: p.google_post_id,
        media_urls: p.media_urls,
        content_preview: p.content?.slice(0, 80)
      });
    });
  }
}
main();

