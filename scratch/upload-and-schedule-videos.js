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
const BUCKET_NAME = 'gbp-media';
const DOWNLOADS_DIR = 'C:\\Users\\Diego G. Damacena\\Downloads\\Leveza dos Pés';

const POSTS_DATA = [
  {
    fileName: 'psoríase na unha.mp4',
    scheduledFor: '2026-11-03T13:00:00.000Z', // Terça-feira, 03/11 às 10:00 BRT
    topic: 'Psoríase Ungueal',
    content: `Você notou alterações, manchas ou ondulações nas unhas? A psoríase ungueal afeta a lâmina da unha, causando espessamento, descamação e desconforto que muitas vezes são confundidos com fungos.

O cuidado podológico especializado é fundamental para proteger a estrutura da unha, aliviar a sensibilidade e orientar os melhores protocolos para a sua saúde e bem-estar.

Na Leveza do Pé, no Sudoeste em Brasília, oferecemos atendimento humanizado com equipamentos modernos e protocolos seguros para devolver a saúde e o conforto aos seus pés.

Clique no botão "Saiba mais" abaixo para agendar a sua avaliação especializada.`
  },
  {
    fileName: 'punha encravada.mp4',
    scheduledFor: '2026-11-05T13:00:00.000Z', // Quinta-feira, 05/11 às 10:00 BRT
    topic: 'Unha Encravada (Onicocriptose)',
    content: `A dor de uma unha encravada não precisa fazer parte da sua rotina. Tentar cortar o canto em casa ou cutucar pode piorar a inflamação e causar infecções dolorosas.

Com técnicas podológicas precisas e instrumentos totalmente esterilizados, realizamos o alívio imediato da pressão na espícula, permitindo que a unha volte a crescer corretamente e sem dor.

Conte com a equipe da Leveza do Pé no Sudoeste em Brasília para recuperar o prazer de caminhar com total conforto e segurança.

Clique no botão "Saiba mais" abaixo e agende seu horário com nossos podólogos.`
  },
  {
    fileName: 'Vídeo sobre atendimento Podologia Leveza do Pé.mp4',
    scheduledFor: '2026-11-09T13:00:00.000Z', // Segunda-feira, 09/11 às 10:00 BRT
    topic: 'Atendimento Podológico Especializado',
    content: `Cuidar dos pés é cuidar da sua qualidade de vida e mobilidade. Um atendimento podológico completo vai muito além da estética: envolve avaliação minuciosa da pisada, saúde das unhas e prevenção de lesões.

Aqui na Leveza do Pé priorizamos rigorosos padrões de biossegurança, ambiente acolhedor e técnicas avançadas para que você se sinta seguro e relaxado em cada consulta.

Localizada no Edifício Lincoln Center no Sudoeste, nossa clínica está pronta para receber você com toda a dedicação que seus pés merecem.

Clique no botão "Saiba mais" abaixo e agende o seu atendimento especializado em Brasília.`
  },
  {
    fileName: 'Podologia é cuidar da saúde e regeneração da unha. Unha descolada, atrofiada e com maceração precisa de atenção.mp4',
    scheduledFor: '2026-11-11T13:00:00.000Z', // Quarta-feira, 11/11 às 10:00 BRT
    topic: 'Regeneração da Unha (Descolada ou Atrofiada)',
    content: `Unha descolada, atrofiada ou com maceração constante precisa de atenção podológica direcionada. Quando o leito ungueal perde a aderência, a umidade e as bactérias encontram o ambiente propício para proliferação.

Nosso tratamento foca na higienização profunda, desinfecção e no estímulo à regeneração saudável da lâmina, devolvendo a integridade e a beleza natural da sua unha.

Agende uma consulta na Leveza do Pé, no Sudoeste em Brasília, e inicie hoje o tratamento adequado para recuperar suas unhas.

Clique no botão "Saiba mais" abaixo para falar diretamente com a nossa equipe.`
  },
  {
    fileName: 'Vídeo da clínica Podologia Leveza do Pé.mp4',
    scheduledFor: '2026-11-13T13:00:00.000Z', // Sexta-feira, 13/11 às 10:00 BRT
    topic: 'Estrutura da Clínica Leveza do Pé',
    content: `Conheça o espaço pensado exclusivamente para o conforto e a saúde dos seus pés em Brasília! Na Leveza do Pé, unimos tecnologia de ponta, materiais 100% esterilizados em autoclave e um ambiente climatizado e acolhedor.

Seja para tratamento de calosidades, unhas encravadas, fungos ou uma sessão preventiva de podologia completa, nossa clínica no Edifício Lincoln Center, no Sudoeste, oferece o melhor cuidado da região.

Dê aos seus pés a atenção e o carinho que eles merecem todos os dias.

Clique no botão "Saiba mais" logo abaixo e venha conhecer nossa estrutura no Sudoeste.`
  }
];

async function main() {
  console.log(`Iniciando upload e agendamento dos 5 vídeos para o cliente ${CLIENT_ID}...`);

  for (let i = 0; i < POSTS_DATA.length; i++) {
    const postItem = POSTS_DATA[i];
    console.log(`\n[${i + 1}/${POSTS_DATA.length}] Processando: "${postItem.fileName}"`);

    const filePath = path.join(DOWNLOADS_DIR, postItem.fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`ERRO: Arquivo não encontrado: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileSizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`Tamanho: ${fileSizeMB} MB. Fazendo upload para o Supabase Storage...`);

    const safeName = postItem.fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const storagePath = `posts/${uniqueId}-${safeName}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadErr) {
      console.error(`Erro no upload de ${postItem.fileName}:`, uploadErr);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;
    console.log(`Upload concluído! URL pública: ${publicUrl}`);

    // Inserir registro na tabela scheduled_posts
    const newPost = {
      client_id: CLIENT_ID,
      content: postItem.content.trim(),
      media_urls: [publicUrl],
      topic_type: 'STANDARD',
      call_to_action: {
        actionType: 'LEARN_MORE',
        url: 'https://wa.me/556132022848'
      },
      scheduled_for: postItem.scheduledFor,
      status: 'scheduled',
      ai_generated: true,
      ai_prompt: postItem.topic
    };

    const { data: insertedPost, error: insertErr } = await supabase
      .from('scheduled_posts')
      .insert([newPost])
      .select('*')
      .single();

    if (insertErr) {
      console.error(`Erro ao inserir agendamento:`, insertErr);
    } else {
      console.log(`Post agendado com sucesso! ID: ${insertedPost.id}`);
      console.log(`Programado para: ${insertedPost.scheduled_for}`);
    }
  }

  console.log('\nTodos os vídeos foram processados e agendados com sucesso!');
}

main().catch(err => {
  console.error('Falha geral no processo:', err);
});

