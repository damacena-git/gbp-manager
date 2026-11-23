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
const CTA = {
  actionType: 'LEARN_MORE',
  url: 'https://wa.me/556132022848'
};

// Helper: upload a local file to Supabase Storage and return public URL
async function uploadFile(fileName) {
  const filePath = path.join(DOWNLOADS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado no disco: ${filePath}`);
  }

  const ext = path.extname(fileName).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
  const mimeType = isVideo ? 'video/mp4' : (ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg'));

  const fileBuffer = fs.readFileSync(filePath);
  const safeName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `posts/${uniqueId}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw new Error(`Falha no upload de ${fileName}: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

const SCHEDULE_PLAN = [
  // 1. Vídeo: Cauterização de Verruga Plantar
  {
    type: 'VIDEO',
    files: ['podologia cauterização de verruga plantar.mp4'],
    scheduledFor: '2026-11-16T13:00:00.000Z', // 16/11 às 10h BRT
    topic: 'Cauterização de Verruga Plantar',
    content: `A verruga plantar, popularmente conhecida como "olho de peixe", é uma lesão viral que pode causar dores agudas e incômodo intenso a cada pisada.

Tentar remover em casa com lixas ou lâminas é perigoso e favorece a proliferação do vírus. O procedimento podológico de cauterização elimina a lesão de forma controlada, higiênica e segura, devolvendo o conforto para caminhar.

Aqui na Leveza do Pé, no Sudoeste em Brasília, você encontra acompanhamento técnico qualificado e total biossegurança.

Clique no botão "Saiba mais" abaixo e agende a sua avaliação com nossos especialistas.`
  },

  // 2. Carrossel: Laserterapia Podológica
  {
    type: 'CAROUSEL',
    files: [
      'tratamento com laser (1).jpeg',
      'tratamento com laser (2).jpeg',
      'tratamento com laser (3).jpeg',
      'tratamento com laser (4).jpeg',
      'tratamento com laser (5).jpeg'
    ],
    scheduledFor: '2026-11-18T13:00:00.000Z', // 18/11 às 10h BRT
    topic: 'Laserterapia na Podologia',
    content: `Você conhece os benefícios da Laserterapia no tratamento dos pés? A tecnologia a laser é uma grande aliada na podologia moderna, oferecendo ação analgésica, anti-inflamatória e regenerativa.

Ela acelera a cicatrização de feridas, potencializa o combate a fungos e micoses nas unhas e alivia dores crônicas sem causar desconforto durante a aplicação.

Na Leveza do Pé, no Edifício Lincoln Center no Sudoeste, aplicamos protocolos avançados de laserterapia para recuperar a saúde e a beleza dos seus pés.

Clique no botão "Saiba mais" abaixo para saber mais e agendar sua sessão.`
  },

  // 3. Vídeo: Cuidados Preventivos Sudeste 1
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (1).mp4'],
    scheduledFor: '2026-11-20T13:00:00.000Z', // 20/11 às 10h BRT
    topic: 'Cuidados Preventivos com os Pés',
    content: `Seus pés sustentam todo o peso do seu corpo e merecem uma rotina de cuidados regulares. A prevenção podológica identifica precocemente alterações na pele, unhas e na pisada antes que se tornem problemas dolorosos.

Uma sessão de podologia periódica renova a sensação de leveza e evita complicações como unhas encravadas, calos e ressecamento profundo.

Venha cuidar de quem leva você a todos os lugares na Leveza do Pé, no Sudoeste em Brasília.

Clique no botão "Saiba mais" abaixo para reservar seu horário de atendimento.`
  },

  // 4. Vídeo: Higiene e Hidratação Sudeste 2
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (2).mp4'],
    scheduledFor: '2026-11-23T13:00:00.000Z', // 23/11 às 10h BRT
    topic: 'Higiene e Hidratação dos Pés',
    content: `Secar bem os espaços entre os dedos após o banho e manter a pele hidratada com produtos específicos para os pés são hábitos simples que fazem toda a diferença para evitar fissuras e infecções por fungos.

Pele ressecada perde a elasticidade natural e pode abrir pequenas rachaduras dolorosas, portas de entrada para bactérias.

Para uma revitalização completa e remoção segura de asperezas, consulte os profissionais da Leveza do Pé no Sudoeste.

Clique no botão "Saiba mais" abaixo e agende a sua sessão de podologia preventiva.`
  },

  // 5. Carrossel: Clínica e Estrutura
  {
    type: 'CAROUSEL',
    files: [
      'podologia leveza do pé.jpg',
      'podologia leveza dos pes.jpeg',
      'podologia leveza dos pes 1.jpeg',
      'podologia leveza dos pes 2.jpeg',
      'leveza do pe sudeste brasilia.webp'
    ],
    scheduledFor: '2026-11-25T13:00:00.000Z', // 25/11 às 10h BRT
    topic: 'Estrutura da Clínica Leveza do Pé',
    content: `Um espaço projetado para o seu conforto, privacidade e bem-estar em Brasília. Na Leveza do Pé, cada detalhe foi planejado para proporcionar uma experiência agradável e relaxante enquanto cuidamos da saúde dos seus pés.

Contamos com cabines individuais, poltronas confortáveis e esterilização de grau hospitalar em autoclave para garantir total segurança aos nossos pacientes.

Estamos localizados na CLSW 300 B, Loja 01, Edifício Lincoln Center no Sudoeste.

Clique no botão "Saiba mais" abaixo e venha nos fazer uma visita!`
  },

  // 6. Vídeo: Avaliação e Biossegurança Sudeste 3
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (3).mp4'],
    scheduledFor: '2026-11-27T13:00:00.000Z', // 27/11 às 10h BRT
    topic: 'Avaliação Podológica e Biossegurança',
    content: `Na podologia, a biossegurança é inegociável. Todo o instrumental utilizado em nossos procedimentos passa por rigoroso processo de lavagem, embalagem e esterilização em autoclave com controle biológico.

Nossa avaliação inicial examina minuciosamente a condição das unhas, pontos de atrito e distribuição de peso nos pés, definindo a conduta mais eficiente para o seu caso.

Tenha a tranquilidade de ser atendido por especialistas dedicados na Leveza do Pé no Sudoeste de Brasília.

Clique no botão "Saiba mais" abaixo para agendar seu horário.`
  },

  // 7. Vídeo: Tratamento de Calosidades Sudeste 5
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (5).mp4'],
    scheduledFor: '2026-11-30T13:00:00.000Z', // 30/11 às 10h BRT
    topic: 'Tratamento de Calosidades e Sobrecarga',
    content: `Calosidades e calos não são apenas questões estéticas: são respostas de defesa da pele contra o atrito e a pressão contínua causados por calçados inadequados ou alterações na pisada.

O desbastamento correto e profissional retira a camada espessa de queratina sem agredir o tecido saudável, proporcionando alívio imediato da queimação e do desconforto ao caminhar.

Recupere a maciez e o bem-estar dos seus pés na Leveza do Pé, no Sudoeste em Brasília.

Clique no botão "Saiba mais" abaixo e consulte nossa equipe especializada.`
  },

  // 8. Vídeo: Fissuras e Calcanhar Rachado Sudeste 6
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (6).mp4'],
    scheduledFor: '2026-12-02T13:00:00.000Z', // 02/12 às 10h BRT
    topic: 'Tratamento de Fissuras e Calcanhar Ressecado',
    content: `Calcanhares ressecados e com fissuras profundas causam dor, sangramento e limitam o uso de sapatos abertos. Lixar o calcanhar em casa com frequência pode produzir o "efeito rebote", deixando a pele ainda mais espessa e ressecada.

O tratamento podológico combina remoção técnica da queratose com protocolos de hidratação oclusiva e dermo-cosméticos que restauram a barreira protetora da pele.

Sinta seus pés suaves e renovados com a Leveza do Pé no Sudoeste em Brasília.

Clique no botão "Saiba mais" abaixo para agendar sua sessão.`
  },

  // 9. Vídeo: Pés Diabéticos e Prevenção Sudeste 7
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (7).mp4'],
    scheduledFor: '2026-12-04T13:00:00.000Z', // 04/12 às 10h BRT
    topic: 'Cuidados com Pés Diabéticos',
    content: `Pessoas com diabetes exigem atenção redobrada com a saúde dos pés. A diminuição da sensibilidade térmica e tátil e a circulação mais lenta aumentam o risco de pequenas lesões evoluírem para feridas complexas.

O acompanhamento podológico preventivo realiza o corte seguro das unhas, controle de calosidades e inspeção contínua da pele para garantir a integridade dos membros inferiores.

Na Leveza do Pé no Sudoeste em Brasília, oferecemos cuidado especializado, preventivo e afetuoso para pacientes diabéticos.

Clique no botão "Saiba mais" abaixo para agendar uma consulta preventiva.`
  },

  // 10. Carrossel: Procedimentos no Sudoeste
  {
    type: 'CAROUSEL',
    files: [
      'podologia sudeste de brasilia (1).jpeg',
      'podologia sudeste de brasilia (2).jpeg',
      'podologia sudeste de brasilia (3).jpeg',
      'podologia sudeste de brasilia (5).jpeg'
    ],
    scheduledFor: '2026-12-07T13:00:00.000Z', // 07/12 às 10h BRT
    topic: 'Procedimentos Podológicos no Sudoeste',
    content: `Unhas saudáveis e pés livres de dores transformam a sua disposição para o trabalho, exercícios e lazer. Tratamos desde queixas pontuais até manutenções preventivas mensais com máxima excelência.

Confira alguns dos nossos atendimentos e veja como o cuidado podológico transforma a saúde e a estética dos pés de forma duradoura.

Agende seu horário na Leveza do Pé, no Edifício Lincoln Center no Sudoeste em Brasília.

Clique no botão "Saiba mais" abaixo para falar diretamente com a nossa equipe no WhatsApp.`
  },

  // 11. Vídeo: Corte Correto da Unha Sudeste 12
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (12).mp4'],
    scheduledFor: '2026-12-09T13:00:00.000Z', // 09/12 às 10h BRT
    topic: 'Corte Correto das Unhas dos Pés',
    content: `Você sabia que a maior causa de unhas encravadas é o corte arredondado nos cantos? Ao cortar as laterais muito rentes, a unha perde a guia de crescimento e acaba penetrando na carne conforme cresce.

O formato correto para as unhas dos pés é reto, apenas com os cantinhos suavemente lixados para não prender nas meias ou sapatos.

Se você tem tendência a unhas encravadas ou sente incômodo nos cantos, conte com a Leveza do Pé no Sudoeste.

Clique no botão "Saiba mais" abaixo e cuide das suas unhas com quem entende do assunto.`
  },

  // 12. Vídeo: Calçados Adequados e Alívio Sudeste 13
  {
    type: 'VIDEO',
    files: ['podologia sudeste de brasilia (13).mp4'],
    scheduledFor: '2026-12-11T13:00:00.000Z', // 11/12 às 10h BRT
    topic: 'Calçados Confortáveis e Saúde dos Pés',
    content: `Sapatos apertados de bico fino e solados rígidos comprimem os dedos e sobrecarregam as articulações, facilitando o surgimento de calos, joanetes e unhas deformadas.

A escolha de calçados anatômicos com espaço adequado para os dedos é indispensável para quem passa muitas horas de pé ou pratica atividades físicas.

Quer orientações personalizadas para o seu tipo de pisada? Venha conversar com nossos podólogos na Leveza do Pé, no Sudoeste em Brasília.

Clique no botão "Saiba mais" abaixo para marcar a sua avaliação.`
  },

  // 13. Carrossel: Pés Renovados para o Fim de Ano
  {
    type: 'CAROUSEL',
    files: [
      'podologia sudeste de brasilia (6).jpeg',
      'podologia sudeste de brasilia (7).jpeg',
      'podologia sudeste de brasilia (8).jpeg',
      'podologia sudeste de brasilia (9).jpeg',
      'WhatsApp Image 2026-05-27 at 09.09.32.jpeg',
      'WhatsApp Image 2026-05-28 at 09.09.48.jpeg'
    ],
    scheduledFor: '2026-12-14T13:00:00.000Z', // 14/12 às 10h BRT
    topic: 'Pés Renovados para as Festas de Fim de Ano',
    content: `Final de ano chegando: época de confraternizações, viagens, praias e momentos especiais com quem amamos! Nada melhor do que estar com os pés impecáveis, macios e sem nenhuma dor para aproveitar cada momento.

Nossos tratamentos completos de podologia deixam seus pés prontos para qualquer ocasião, garantindo conforto e beleza para usar calçados abertos com total confiança.

Garanta sua vaga de fim de ano na Leveza do Pé no Sudoeste em Brasília!

Clique no botão "Saiba mais" abaixo e reserve seu atendimento antes que a agenda lote.`
  },

  // 14. Vídeo: Bastidores e Atendimento WhatsApp Video
  {
    type: 'VIDEO',
    files: ['WhatsApp Video 2026-05-27 at 09.49.07.mp4'],
    scheduledFor: '2026-12-16T13:00:00.000Z', // 16/12 às 10h BRT
    topic: 'Atendimento Dedicado na Leveza do Pé',
    content: `Veja de perto a dedicação e o cuidado colocados em cada atendimento na Leveza do Pé. Nosso compromisso é proporcionar a você um momento de relaxamento e alívio das tensões diárias, com foco exclusivo na saúde dos seus pés.

Com anos de experiência e milhares de pacientes atendidos no Sudoeste em Brasília, nossa clínica é o seu ponto de referência em podologia de alta qualidade.

Dê aos seus pés a leveza que eles merecem para terminar o ano com saúde e disposição renovadas!

Clique no botão "Saiba mais" abaixo para agendar seu horário.`
  }
];

async function main() {
  console.log(`Iniciando agendamento de todos os materiais pendentes (${SCHEDULE_PLAN.length} posts programados)...`);

  for (let i = 0; i < SCHEDULE_PLAN.length; i++) {
    const plan = SCHEDULE_PLAN[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[${i + 1}/${SCHEDULE_PLAN.length}] Processando: "${plan.topic}" (${plan.type})`);
    console.log(`Arquivos: ${plan.files.join(', ')}`);
    console.log(`Programado para: ${plan.scheduledFor}`);

    // Upload de todos os arquivos do post
    const uploadedUrls = [];
    for (const f of plan.files) {
      process.stdout.write(`Fazendo upload de "${f}"... `);
      const url = await uploadFile(f);
      uploadedUrls.push(url);
      console.log(`OK!`);
    }

    // Inserção na tabela scheduled_posts
    const newPost = {
      client_id: CLIENT_ID,
      content: plan.content.trim(),
      media_urls: uploadedUrls,
      topic_type: 'STANDARD',
      call_to_action: CTA,
      scheduled_for: plan.scheduledFor,
      status: 'scheduled',
      ai_generated: true,
      ai_prompt: plan.topic
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('scheduled_posts')
      .insert([newPost])
      .select('id, scheduled_for, topic_type')
      .single();

    if (insertErr) {
      console.error(`Erro ao inserir no banco:`, insertErr);
    } else {
      console.log(`Post criado com sucesso! ID: ${inserted.id} | Data: ${inserted.scheduled_for}`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`Sucesso absoluto! Todos os 14 novos posts foram carregados e agendados.`);
  console.log(`============================================================`);
}

main().catch(err => {
  console.error('Falha geral no script:', err);
});

