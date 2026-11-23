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
  const { data: client } = await supabase.from('clients').select('id, user_id, business_name').eq('id', clientId).single();
  console.log('Client info:', client);

  const { data: scheduled } = await supabase
    .from('scheduled_posts')
    .select('id, scheduled_for, status, created_at, content')
    .eq('client_id', clientId)
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true });

  console.log('Currently scheduled posts for Leveza:', scheduled);
}
main();

