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
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('id, topic_type, call_to_action, content')
    .eq('client_id', '41659399-9597-4701-adc1-3947a94eaa6f')
    .limit(5);

  console.log('Sample posts CTAs:');
  posts.forEach(p => console.log({ topic_type: p.topic_type, call_to_action: p.call_to_action }));
}
main();

