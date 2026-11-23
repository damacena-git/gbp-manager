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

function normalize(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

async function run() {
  const fileNames = fs.readdirSync(FOLDER_PATH);
  
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('client_id', CLIENT_ID);

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('client_id', CLIENT_ID);

  const report = [];

  for (const name of fileNames) {
    const filePath = path.join(FOLDER_PATH, name);
    const stats = fs.statSync(filePath);
    const ext = path.extname(name).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const normName = normalize(name);

    let status = 'PENDENTE';
    let detail = '';

    // 1. Verificar se está nos 5 agendados
    const scheduledMatch = posts.find(p => p.status === 'scheduled' && (p.media_urls || []).some(u => normalize(u).includes(normName) || normName.includes(normalize(u).slice(-25))));
    if (scheduledMatch) {
      status = 'AGENDADO';
      detail = `Agendado para ${scheduledMatch.scheduled_for}`;
    } else {
      // 2. Verificar se está em posts publicados
      const publishedPost = posts.find(p => p.status === 'published' && (
        (p.media_urls || []).some(u => {
          const uDec = decodeURIComponent(u);
          const uNorm = normalize(uDec);
          return uNorm.includes(normName) || (normName.length > 10 && uNorm.includes(normName.slice(0, 20)));
        }) ||
        (normName.includes('cauterizacaodeverrugaplantar') && p.content && normalize(p.content).includes('cauterizacaodeverrugaplantar')) ||
        (normName.includes('tratamentodecaloprofundo') && !normName.includes('2mp4') && p.content && normalize(p.content).includes('caloprofundo') && (p.media_urls || []).some(u => u.includes('Tratamento_de_calo_profundo'))) ||
        (normName.includes('remocaodepeleonifocose') && p.content && normalize(p.content).includes('onicofose')) ||
        (normName.includes('ungonaundanicomicose') && p.content && normalize(p.content).includes('onicomicose')) ||
        (normName.includes('tratamentocomlaserparafungos') && p.content && normalize(p.content).includes('laserparafungos'))
      ));

      if (publishedPost) {
        status = 'PUBLICADO';
        detail = `Publicado em ${publishedPost.published_at || publishedPost.scheduled_for}`;
      } else {
        // 3. Verificar se corresponde às fotos publicadas em posts múltiplos (ex: HPV, Verruga no polegar)
        if (normName.includes('infeccaoviralhpv')) {
          status = 'PUBLICADO';
          detail = 'Publicado no post de Tratamento de Verruga Plantar (HPV) em 10/06/2026';
        } else if (normName.includes('verruganopolegar')) {
          status = 'PUBLICADO';
          detail = 'Publicado no post de Verruga no Polegar em 10/06/2026';
        } else if (normName.includes('rankpng')) {
          status = 'RELATORIO_INTERNO';
          detail = 'Imagem de rank/gráfico de posicionamento (material analítico interno)';
        } else if (normName.includes('logolevezadope')) {
          status = 'IDENTIDADE_VISUAL';
          detail = 'Logo oficial da clínica (usada como foto de perfil/capa)';
        }
      }
    }

    report.push({
      name,
      isVideo,
      isImage,
      sizeMB,
      status,
      detail
    });
  }

  // Estatísticas
  const agendados = report.filter(r => r.status === 'AGENDADO');
  const publicados = report.filter(r => r.status === 'PUBLICADO');
  const internos = report.filter(r => r.status === 'RELATORIO_INTERNO' || r.status === 'IDENTIDADE_VISUAL');
  const pendentes = report.filter(r => r.status === 'PENDENTE');

  console.log('=== RESULTADO FINAL ===');
  console.log(`Total: ${report.length}`);
  console.log(`Agendados: ${agendados.length}`);
  console.log(`Já Publicados no Google: ${publicados.length}`);
  console.log(`Materiais de Apoio / Internos / Logo: ${internos.length}`);
  console.log(`Pendentes para Postar / Agendar: ${pendentes.length}`);

  console.log('\n--- VÍDEOS PENDENTES (' + pendentes.filter(r => r.isVideo).length + ') ---');
  pendentes.filter(r => r.isVideo).forEach(r => console.log(`- ${r.name} (${r.sizeMB} MB)`));

  console.log('\n--- IMAGENS PENDENTES (' + pendentes.filter(r => r.isImage).length + ') ---');
  pendentes.filter(r => r.isImage).forEach(r => console.log(`- ${r.name} (${r.sizeMB} MB)`));

  fs.writeFileSync(path.resolve(__dirname, 'detailed-report.json'), JSON.stringify(report, null, 2));
}

run().catch(console.error);

