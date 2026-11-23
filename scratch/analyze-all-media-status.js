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

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('Analisando arquivos e postagens do cliente Leveza dos Pés...\n');

  // 1. Ler todos os arquivos da pasta
  const fileNames = fs.readdirSync(FOLDER_PATH);
  const files = fileNames.map(name => {
    const fullPath = path.join(FOLDER_PATH, name);
    const stats = fs.statSync(fullPath);
    const ext = path.extname(name).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.webm', '.avi'].includes(ext);
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    return {
      name,
      ext,
      sizeBytes: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2),
      modified: stats.mtime,
      isVideo,
      isImage,
      normalized: normalizeText(name)
    };
  });

  console.log(`Total de arquivos encontrados na pasta: ${files.length}`);
  console.log(`Vídeos (.mp4): ${files.filter(f => f.isVideo).length}`);
  console.log(`Imagens: ${files.filter(f => f.isImage).length}\n`);

  // 2. Buscar todas as postagens no banco
  const { data: posts, error: pErr } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('client_id', CLIENT_ID)
    .order('created_at', { ascending: false });

  if (pErr) {
    console.error('Erro ao buscar posts:', pErr);
    return;
  }
  console.log(`Total de posts no banco para este cliente: ${posts.length}`);

  // 3. Buscar fotos cadastradas no banco
  const { data: photos, error: phErr } = await supabase
    .from('photos')
    .select('*')
    .eq('client_id', CLIENT_ID);

  console.log(`Total de fotos cadastradas na tabela photos: ${photos ? photos.length : 0}\n`);

  // 4. Mapear status de cada arquivo
  const results = [];

  for (const file of files) {
    // Procurar nas postagens
    let matchedPost = null;
    let matchType = null;

    for (const post of posts) {
      const mediaUrls = post.media_urls || [];
      const normalizedContent = normalizeText(post.content);
      const normalizedPrompt = normalizeText(post.ai_prompt);

      // Verificar se a URL do arquivo no Supabase Storage contém o nome normalizado
      const urlMatch = mediaUrls.some(url => {
        const decodedUrl = decodeURIComponent(url);
        const normUrl = normalizeText(decodedUrl);
        return normUrl.includes(file.normalized) || file.normalized.includes(normUrl);
      });

      if (urlMatch) {
        matchedPost = post;
        matchType = 'URL exata no Storage';
        break;
      }

      // Verificar se o conteúdo ou o prompt bate diretamente com o título do arquivo
      const fileStem = path.parse(file.name).name;
      const normStem = normalizeText(fileStem);
      if (normStem.length > 8 && (normalizedContent.includes(normStem) || normalizedPrompt.includes(normStem))) {
        matchedPost = post;
        matchType = 'Título/Tema no post';
        break;
      }
    }

    // Verificar se está na tabela photos
    let matchedPhoto = null;
    if (photos && photos.length > 0) {
      for (const ph of photos) {
        const normPhUrl = normalizeText(decodeURIComponent(ph.url || ph.google_url || ''));
        if (normPhUrl.includes(file.normalized)) {
          matchedPhoto = ph;
          break;
        }
      }
    }

    results.push({
      file,
      matchedPost,
      matchType,
      matchedPhoto,
      status: matchedPost
        ? (matchedPost.status === 'published' ? 'POSTADO' : 'AGENDADO')
        : (matchedPhoto ? 'FOTO_PUBLICADA' : 'PENDENTE')
    });
  }

  // Agrupar resultados
  const scheduled = results.filter(r => r.status === 'AGENDADO');
  const published = results.filter(r => r.status === 'POSTADO' || r.status === 'FOTO_PUBLICADA');
  const pending = results.filter(r => r.status === 'PENDENTE');

  console.log('====================================================');
  console.log(`RESUMO GERAL:`);
  console.log(`- Já Postados: ${published.length}`);
  console.log(`- Agendados: ${scheduled.length}`);
  console.log(`- Pendentes (NÃO POSTADOS): ${pending.length}`);
  console.log('====================================================\n');

  console.log('--- 1. ARQUIVOS ATUALMENTE AGENDADOS ---');
  scheduled.forEach(r => {
    console.log(`[AGENDADO para ${r.matchedPost.scheduled_for}] ${r.file.name} (${r.file.sizeMB} MB)`);
  });

  console.log('\n--- 2. ARQUIVOS JÁ POSTADOS (PUBLICADOS) ---');
  published.forEach(r => {
    console.log(`[PUBLICADO em ${r.matchedPost?.published_at || 'Google Photos'}] ${r.file.name} (${r.file.sizeMB} MB)`);
  });

  console.log('\n--- 3. ARQUIVOS PENDENTES (FALTANDO POSTAR / AGENDAR) ---');
  pending.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.file.isVideo ? 'VÍDEO' : 'IMAGEM'}] ${r.file.name} (${r.file.sizeMB} MB)`);
  });

  // Salvar relatório detalhado em JSON para inspeção rápida
  fs.writeFileSync(
    path.resolve(__dirname, 'media-audit-results.json'),
    JSON.stringify({ scheduled, published, pending }, null, 2)
  );
  console.log('\nRelatório salvo em media-audit-results.json');
}

main().catch(console.error);

