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
  const { data: scheduled } = await supabase.from('scheduled_posts')
    .select('id, scheduled_for, status, ai_prompt, media_urls')
    .eq('client_id', '599e41ac-8a09-4f68-83ec-a5cb126f178b')
    .eq('status', 'scheduled')
    .order('scheduled_for', { ascending: true });

  console.log('TOTAL DE POSTS AGENDADOS PARA CLAUDIA:', scheduled.length);
  scheduled.forEach((p, i) => console.log(`${i+1}. [${p.scheduled_for}] ${p.ai_prompt} (${(p.media_urls||[]).length} mídias)`));
}

main();

