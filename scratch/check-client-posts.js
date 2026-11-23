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
  const { data: clients, error: cErr } = await supabase.from('clients').select('*');
  if (cErr) {
    console.error('clients err:', cErr);
  } else {
    console.log('--- CLIENTS ---');
    clients.forEach(c => console.log(JSON.stringify({ id: c.id, business_name: c.business_name, address: c.address, phone: c.phone, website: c.website })));
  }

  const { data: posts, error: pErr } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (pErr) {
    console.error('posts err:', pErr);
  } else {
    console.log('--- RECENT POSTS ---');
    posts.forEach(p => console.log(JSON.stringify({
      id: p.id,
      client_id: p.client_id,
      summary: p.summary?.slice(0, 50),
      media_url: p.media_url,
      media_type: p.media_type,
      scheduled_for: p.scheduled_for,
      status: p.status,
      call_to_action: p.call_to_action
    })));
  }
}
main();

