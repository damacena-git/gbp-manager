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
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('id, content, media_urls, status, scheduled_for, published_at')
    .eq('client_id', CLIENT_ID);

  console.log('TOTAL POSTS IN DB:', posts.length);
  
  // List all files in posts/ in Supabase Storage
  const { data: storageFiles } = await supabase.storage.from('gbp-media').list('posts', { limit: 1000 });
  console.log('TOTAL STORAGE FILES IN gbp-media/posts:', storageFiles ? storageFiles.length : 0);

  const localFiles = fs.readdirSync(FOLDER_PATH);

  // Group pending files by videos vs images
  const audit = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'media-audit-results.json'), 'utf8'));

  console.log('\n--- VERIFICAÇÃO ESPECÍFICA DE CALO PROFUNDO ---');
  posts.forEach(p => {
    const urls = (p.media_urls || []).join(' ');
    if (urls.toLowerCase().includes('calo_profundo') || p.content.toLowerCase().includes('calo profundo')) {
      console.log('Found post with calo profundo:', {
        id: p.id,
        status: p.status,
        published_at: p.published_at,
        url: p.media_urls
      });
    }
  });

  console.log('\n--- VERIFICAÇÃO ESPECÍFICA DE VERRUGA PLANTAR / HPV ---');
  posts.forEach(p => {
    const urls = (p.media_urls || []).join(' ');
    if (urls.toLowerCase().includes('verruga') || urls.toLowerCase().includes('hpv') || p.content.toLowerCase().includes('verruga plantar')) {
      console.log('Found post with verruga/hpv:', {
        id: p.id,
        status: p.status,
        published_at: p.published_at,
        url: p.media_urls,
        preview: p.content.slice(0, 60)
      });
    }
  });
}

main().catch(console.error);

