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

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

async function main() {
  const files = fs.readdirSync(FOLDER_PATH);
  console.log(`TOTAL DE ARQUIVOS NA PASTA: ${files.length}\n`);

  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('client_id', CLIENT_ID);

  console.log(`POSTS REGISTRADOS: ${posts.length}\n`);

  const results = [];

  for (const file of files) {
    const fullPath = path.join(FOLDER_PATH, file);
    const stats = fs.statSync(fullPath);
    const ext = path.extname(file).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const norm = normalize(file);

    // Check matched post in DB
    let matchedPost = null;
    for (const p of posts) {
      const urls = (p.media_urls || []).map(u => normalize(decodeURIComponent(u)));
      if (urls.some(u => u.includes(norm) || (norm.length > 8 && u.includes(norm.slice(0, 15))))) {
        matchedPost = p;
        break;
      }
    }

    let status = 'PENDENTE';
    if (matchedPost) {
      status = matchedPost.status === 'published' ? 'PUBLICADO' : 'AGENDADO';
    } else if (file.startsWith('Screenshot_')) {
      status = 'PRINT_INTERNO';
    }

    results.push({
      file,
      isVideo,
      isImage,
      sizeMB,
      status,
      postDate: matchedPost ? (matchedPost.published_at || matchedPost.scheduled_for) : null,
      postId: matchedPost ? matchedPost.id : null
    });
  }

  const agendados = results.filter(r => r.status === 'AGENDADO');
  const publicados = results.filter(r => r.status === 'PUBLICADO');
  const prints = results.filter(r => r.status === 'PRINT_INTERNO');
  const pendentes = results.filter(r => r.status === 'PENDENTE');

  console.log(`RESUMO:`);
  console.log(`- Agendados: ${agendados.length}`);
  console.log(`- Publicados: ${publicados.length}`);
  console.log(`- Prints Internos: ${prints.length}`);
  console.log(`- Pendentes: ${pendentes.length}\n`);

  console.log('--- 1. AGENDADOS ---');
  agendados.forEach(r => console.log(`[${r.postDate}] ${r.file} (${r.sizeMB} MB)`));

  console.log('\n--- 2. JÁ PUBLICADOS ---');
  publicados.forEach(r => console.log(`[${r.postDate}] ${r.file} (${r.sizeMB} MB)`));

  console.log('\n--- 3. PRINTS DE TELA / INTERNOS ---');
  prints.forEach(r => console.log(`${r.file} (${r.sizeMB} MB)`));

  console.log('\n--- 4. PENDENTES (VÍDEOS) (' + pendentes.filter(r => r.isVideo).length + ') ---');
  pendentes.filter(r => r.isVideo).forEach(r => console.log(`- ${r.file} (${r.sizeMB} MB)`));

  console.log('\n--- 5. PENDENTES (IMAGENS) (' + pendentes.filter(r => r.isImage).length + ') ---');
  pendentes.filter(r => r.isImage).forEach(r => console.log(`- ${r.file} (${r.sizeMB} MB)`));
}

main().catch(console.error);

