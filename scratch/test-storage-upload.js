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
  const BUCKET_NAME = 'gbp-media';
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.error('List buckets error:', bErr);
    return;
  }
  console.log('Buckets:', buckets.map(b => b.name));

  const sampleFile = 'C:\\Users\\Diego G. Damacena\\Downloads\\Leveza dos Pés\\psoríase na unha.mp4';
  const stats = fs.statSync(sampleFile);
  console.log('Sample file size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
}
main();

