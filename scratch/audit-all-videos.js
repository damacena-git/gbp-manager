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
const FOLDER_PATH = 'C:\\Users\\Diego G. Damacena\\Downloads\\Leveza dos Pés';

async function main() {
  const files = fs.readdirSync(FOLDER_PATH);
  const mp4Files = files.filter(f => f.endsWith('.mp4'));

  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('client_id', CLIENT_ID);

  console.log(`TOTAL DE VÍDEOS NA PASTA: ${mp4Files.length}\n`);

  mp4Files.forEach((file, index) => {
    const stats = fs.statSync(path.join(FOLDER_PATH, file));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    // Check scheduled
    const sched = posts.find(p => p.status === 'scheduled' && (p.media_urls || []).some(u => {
      const decoded = decodeURIComponent(u).toLowerCase();
      const normF = file.toLowerCase().slice(0, 15);
      return decoded.includes(normF);
    }));

    if (sched) {
      console.log(`${index + 1}. [AGENDADO para ${sched.scheduled_for}] ${file} (${sizeMB} MB)`);
      return;
    }

    // Check published
    const pub = posts.find(p => p.status === 'published' && (p.media_urls || []).some(u => {
      const decoded = decodeURIComponent(u).toLowerCase();
      // Match key identifiers
      if (file.includes('podologia sudeste de brasilia')) {
        const numMatch = file.match(/\((\d+)\)/);
        if (numMatch) {
          return decoded.includes(`_${numMatch[1]}_`) || decoded.includes(`(${numMatch[1]})`);
        }
      }
      const stem = path.parse(file).name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uStem = decoded.replace(/[^a-z0-9]/g, '');
      return uStem.includes(stem.slice(0, 15)) || (p.content && p.content.toLowerCase().replace(/[^a-z0-9]/g, '').includes(stem.slice(0, 15)));
    }));

    if (pub) {
      console.log(`${index + 1}. [JÁ PUBLICADO em ${pub.published_at || pub.scheduled_for}] ${file} (${sizeMB} MB)`);
      return;
    }

    console.log(`${index + 1}. [PENDENTE] ${file} (${sizeMB} MB)`);
  });
}

main().catch(console.error);

