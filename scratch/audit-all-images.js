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
  const imageFiles = files.filter(f => !f.endsWith('.mp4'));

  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('client_id', CLIENT_ID);

  console.log(`TOTAL DE IMAGENS NA PASTA: ${imageFiles.length}\n`);

  imageFiles.forEach((file, index) => {
    const stats = fs.statSync(path.join(FOLDER_PATH, file));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    const pub = posts.find(p => p.status === 'published' && (p.media_urls || []).some(u => {
      const decoded = decodeURIComponent(u).toLowerCase();
      if (file.includes('podologia sudeste de brasilia')) {
        const numMatch = file.match(/\((\d+)\)/);
        if (numMatch) {
          return (decoded.includes(`_${numMatch[1]}_`) || decoded.includes(`(${numMatch[1]})`)) && decoded.includes('jpeg');
        }
      }
      return false;
    }));

    if (pub) {
      console.log(`${index + 1}. [JÁ PUBLICADA em ${pub.published_at}] ${file} (${sizeMB} MB)`);
      return;
    }

    if (file.includes('infecção viral HPV') || file.includes('Verruga no polegar') || file.includes('laser para fungos nas unhas')) {
      console.log(`${index + 1}. [JÁ PUBLICADA em 2026-06-10 / 2026-05-28] ${file} (${sizeMB} MB)`);
      return;
    }

    if (file.includes('rank.png')) {
      console.log(`${index + 1}. [MATERIAL INTERNO DE RANKING] ${file} (${sizeMB} MB)`);
      return;
    }

    if (file.includes('logo leveza')) {
      console.log(`${index + 1}. [LOGO / IDENTIDADE VISUAL] ${file} (${sizeMB} MB)`);
      return;
    }

    console.log(`${index + 1}. [PENDENTE] ${file} (${sizeMB} MB)`);
  });
}

main().catch(console.error);

