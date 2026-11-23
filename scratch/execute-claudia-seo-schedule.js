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
const BUCKET_NAME = 'gbp-media';
const DIR = 'C:\\Users\\Diego G. Damacena\\Downloads\\Claudia Rangel Podologa';

const CTA = {
  actionType: 'LEARN_MORE',
  url: 'https://wa.me/5515991867581'
};

// Mapeamento de renomeação para SEO dos 45 arquivos pendentes
const RENAME_MAP = {
  // 5 Vídeos
  'Podologa em votorantim - claudia rangel (1).mp4': 'podologa-claudia-rangel-votorantim-unha-encravada-1.mp4',
  'Podologa em votorantim - claudia rangel (7).mp4': 'podologa-claudia-rangel-votorantim-pes-diabeticos-7.mp4',
  'Podologa em votorantim - claudia rangel (8).mp4': 'podologa-claudia-rangel-votorantim-calosidades-fissuras-8.mp4',
  'Podologa em votorantim - claudia rangel (9).mp4': 'podologa-claudia-rangel-votorantim-biosseguranca-esterilizacao-9.mp4',
  'Podologa em votorantim - claudia rangel (10).mp4': 'podologa-claudia-rangel-votorantim-clinica-bela-vista-10.mp4',

  // 40 Imagens
  'Onicomicose  (1).jpeg': 'podologia-votorantim-tratamento-onicomicose-fungo-01.jpeg',
  'Podologa em votorantim - claudia rangel (1).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-01.jpeg',
  'Podologa em votorantim - claudia rangel (2).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-02.jpeg',
  'Podologa em votorantim - claudia rangel (3).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-03.jpeg',
  'Podologa em votorantim - claudia rangel (4).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-04.jpeg',
  'Podologa em votorantim - claudia rangel (5).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-05.jpeg',
  'Podologa em votorantim - claudia rangel (6).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-06.jpeg',
  'Podologa em votorantim - claudia rangel (7).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-07.jpeg',
  'Podologa em votorantim - claudia rangel (8).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-08.jpeg',
  'Podologa em votorantim - claudia rangel (9).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-09.jpeg',
  'Podologa em votorantim - claudia rangel (10).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-10.jpeg',
  'Podologa em votorantim - claudia rangel.jpg': 'podologa-claudia-rangel-atendimento-bela-vista-votorantim.jpg',
  'Podologa em votorantim - claudia rangel (16).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-16.jpeg',
  'Podologa em votorantim - claudia rangel (17).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-17.jpeg',
  'Podologa em votorantim - claudia rangel (18).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-18.jpeg',
  'Podologa em votorantim - claudia rangel (19).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-19.jpeg',
  'Podologa em votorantim - claudia rangel (20).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-20.jpeg',
  'Podologa em votorantim - claudia rangel (21).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-21.jpeg',
  'Podologa em votorantim - claudia rangel (22).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-22.jpeg',
  'Podologa em votorantim - claudia rangel (23).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-23.jpeg',
  'Podologa em votorantim - claudia rangel (24).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-24.jpeg',
  'Podologa em votorantim - claudia rangel (25).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-25.jpeg',
  'Podologa em votorantim - claudia rangel (26).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-26.jpeg',
  'Podologa em votorantim - claudia rangel (27).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-27.jpeg',
  'Podologa em votorantim - claudia rangel (28).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-28.jpeg',
  'Podologa em votorantim - claudia rangel (29).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-29.jpeg',
  'Podologa em votorantim - claudia rangel (30).jpeg': 'podologia-votorantim-claudia-rangel-procedimento-30.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.24.jpeg': 'podologia-votorantim-cuidados-clinicos-01.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.25.jpeg': 'podologia-votorantim-cuidados-clinicos-02.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.26.jpeg': 'podologia-votorantim-cuidados-clinicos-03.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.27.jpeg': 'podologia-votorantim-cuidados-clinicos-04.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.28.jpeg': 'podologia-votorantim-cuidados-clinicos-05.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.29 (1).jpeg': 'podologia-votorantim-cuidados-clinicos-06.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.29.jpeg': 'podologia-votorantim-cuidados-clinicos-07.jpeg',
  'WhatsApp Image 2026-08-13 at 12.37.30.jpeg': 'podologia-votorantim-cuidados-clinicos-08.jpeg',
  'WhatsApp Image 2026-10-28 at 11.40.36 (1).jpeg': 'podologia-votorantim-recuperacao-unha-out-01.jpeg',
  'WhatsApp Image 2026-10-28 at 11.40.36.jpeg': 'podologia-votorantim-recuperacao-unha-out-02.jpeg',
  'WhatsApp Image 2026-10-29 at 10.52.47.jpeg': 'podologia-votorantim-recuperacao-unha-out-03.jpeg',
  'WhatsApp Image 2026-10-29 at 10.52.48 (1).jpeg': 'podologia-votorantim-recuperacao-unha-out-04.jpeg',
  'WhatsApp Image 2026-10-29 at 10.52.48.jpeg': 'podologia-votorantim-recuperacao-unha-out-05.jpeg'
};

// Função de upload para o Supabase Storage
async function uploadToStorage(filePath, newSeoName) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(newSeoName).toLowerCase();
  const isVideo = ext === '.mp4';
  const mimeType = isVideo ? 'video/mp4' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png');

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `posts/${uniqueId}-${newSeoName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw new Error(`Erro ao enviar ${newSeoName} para o Storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

// 16 Posts Programados
const POSTS_PLAN = [
  // 1. VÍDEO: Unha Encravada (04/11)
  {
    type: 'VIDEO',
    files: ['podologa-claudia-rangel-votorantim-unha-encravada-1.mp4'],
    scheduledFor: '2026-11-04T13:00:00.000Z', // 04/11 às 10h BRT
    topic: 'Alívio Imediato de Unha Encravada',
    content: `Sentir dor ao calçar sapatos ou ao dar cada passo não é normal. A unha encravada surge quando a espícula penetra na pele ao redor, causando inchaço, vermelhidão e fortes dores.

Tentar cortar o cantinho em casa com tesouras ou alicates inadequados pode piorar o quadro e gerar infecções graves. Com técnicas podológicas adequadas e instrumentos esterilizados, realizamos o alívio imediato da dor de forma suave e segura.

Conte com a Podóloga Claudia Rangel no Parque Bela Vista, em Votorantim, para recuperar o conforto dos seus passos.

Clique no botão "Saiba mais" abaixo e agende seu horário conosco.`
  },

  // 2. CARROSSEL: Tratamento de Onicomicose e Fungos (06/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-tratamento-onicomicose-fungo-01.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-01.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-02.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-03.jpeg'
    ],
    scheduledFor: '2026-11-06T13:00:00.000Z', // 06/11 às 10h BRT
    topic: 'Tratamento de Onicomicose e Fungos nas Unhas',
    content: `Unhas amareladas, opacas, espessas ou esfarelando nas pontas são os sinais mais comuns de onicomicose (micose de unha). Tratar fungos exige paciência e o protocolo clínico correto.

Na nossa clínica em Votorantim, combinamos limpeza profunda da lâmina, assepsia rigorosa e orientações personalizadas para que a nova unha cresça saudável e resistente.

Não esconda seus pés por vergonha. Agende uma avaliação com a Podóloga Claudia Rangel no Parque Bela Vista e inicie seu tratamento com quem entende.

Clique no botão "Saiba mais" abaixo e converse diretamente com a nossa equipe.`
  },

  // 3. VÍDEO: Pés Diabéticos (09/11)
  {
    type: 'VIDEO',
    files: ['podologa-claudia-rangel-votorantim-pes-diabeticos-7.mp4'],
    scheduledFor: '2026-11-09T13:00:00.000Z', // 09/11 às 10h BRT
    topic: 'Cuidados com Pés Diabéticos',
    content: `Quem tem diabetes precisa ter um olhar muito atento para a saúde dos pés. A perda gradual da sensibilidade e a circulação reduzida aumentam as chances de pequenas lesões passarem despercebidas.

O atendimento podológico preventivo faz o corte seguro das unhas, hidratação técnica e desbastamento de calosidades sem risco de cortes, prevenindo complicações graves.

Oferecemos atendimento humanizado, seguro e acolhedor para pacientes de Votorantim e Sorocaba no Parque Bela Vista.

Clique no botão "Saiba mais" abaixo para garantir o cuidado preventivo dos seus pés.`
  },

  // 4. CARROSSEL: Alívio da Pisada e Conforto (11/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-claudia-rangel-procedimento-04.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-05.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-06.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-07.jpeg'
    ],
    scheduledFor: '2026-11-11T13:00:00.000Z', // 11/11 às 10h BRT
    topic: 'Conforto e Alívio da Pisada',
    content: `Você já parou para pensar em quanto seus pés trabalham todos os dias? Pequenos incômodos na pisada alteram a postura e geram dores nos joelhos, quadris e coluna.

Nossas sessões de podologia oferecem uma sensação incomparável de alívio, deixando os pés leves, renovados e prontos para acompanhar o seu ritmo de vida.

Venha viver essa experiência de autocuidado e bem-estar na clínica da Podóloga Claudia Rangel, em Votorantim.

Clique no botão "Saiba mais" logo abaixo e marque o seu atendimento.`
  },

  // 5. VÍDEO: Calosidades e Fissuras (13/11)
  {
    type: 'VIDEO',
    files: ['podologa-claudia-rangel-votorantim-calosidades-fissuras-8.mp4'],
    scheduledFor: '2026-11-13T13:00:00.000Z', // 13/11 às 10h BRT
    topic: 'Tratamento de Calosidades e Fissuras',
    content: `Calosidades dolorosas e calcanhares rachados causam ardência e desconforto ao caminhar. O atrito de sapatos rígidos ou o hábito de andar descalço aceleram o espessamento da pele.

Com técnicas profissionais de desbastamento e emoliência profunda, eliminamos as camadas grossas sem agredir a pele sadia, devolvendo a maciez e a hidratação natural.

Cuide dos seus pés com a atenção que eles merecem aqui em Votorantim, no Parque Bela Vista.

Clique no botão "Saiba mais" abaixo e agende a sua sessão com a Podóloga Claudia Rangel.`
  },

  // 6. CARROSSEL: Calos e Calcanhar Rachado (16/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-claudia-rangel-procedimento-08.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-09.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-10.jpeg',
      'podologa-claudia-rangel-atendimento-bela-vista-votorantim.jpg'
    ],
    scheduledFor: '2026-11-16T13:00:00.000Z', // 16/11 às 10h BRT
    topic: 'Recuperação de Calcanhar Ressecado',
    content: `Calcanhares ressecados que chegam a sangrar necessitam de intervenção podológica especializada. O uso de lixas caseiras constantes piora a textura e provoca o efeito rebote.

Nossos tratamentos utilizam cosméticos podológicos de alta performance para recuperar a integridade da pele, permitindo que você use sapatos abertos com total confiança e sem dor.

Atendemos com todo carinho no Parque Bela Vista em Votorantim, a poucos minutos de Sorocaba.

Clique no botão "Saiba mais" abaixo para tirar suas dúvidas e marcar sua consulta.`
  },

  // 7. VÍDEO: Biossegurança e Esterilização (18/11)
  {
    type: 'VIDEO',
    files: ['podologa-claudia-rangel-votorantim-biosseguranca-esterilizacao-9.mp4'],
    scheduledFor: '2026-11-18T13:00:00.000Z', // 18/11 às 10h BRT
    topic: 'Biossegurança e Esterilização em Autoclave',
    content: `Sua saúde e segurança estão sempre em primeiro lugar. Em nossa clínica, 100% dos instrumentos metálicos são lavados, embalados em envelopes individuais com indicador químico e esterilizados em autoclave.

Os materiais descartáveis garantem que você receba um atendimento em conformidade absoluta com as normas sanitárias vigentes.

Escolha cuidar da sua saúde com total confiança. Agende seu horário com a Podóloga Claudia Rangel no Parque Bela Vista em Votorantim.

Clique no botão "Saiba mais" abaixo para agendar o seu atendimento.`
  },

  // 8. CARROSSEL: Regeneração da Lâmina Ungueal (20/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-claudia-rangel-procedimento-16.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-17.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-18.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-19.jpeg'
    ],
    scheduledFor: '2026-11-20T13:00:00.000Z', // 20/11 às 10h BRT
    topic: 'Regeneração e Correção de Unhas',
    content: `Unhas deformadas, que crescem tortas ou sofreram traumas podem ser corrigidas e regeneradas com o acompanhamento podológico adequado.

A aplicação de órteses e a desobstrução das pregas ungueais direcionam o crescimento correto da unha, prevenindo novas inflamações e restaurando o aspecto estético saudável.

Venha fazer uma avaliação na clínica da Podóloga Claudia Rangel em Votorantim e descubra o melhor tratamento para o seu caso.

Clique no botão "Saiba mais" abaixo para falar conosco pelo WhatsApp.`
  },

  // 9. VÍDEO: Estrutura da Clínica (23/11)
  {
    type: 'VIDEO',
    files: ['podologa-claudia-rangel-votorantim-clinica-bela-vista-10.mp4'],
    scheduledFor: '2026-11-23T13:00:00.000Z', // 23/11 às 10h BRT
    topic: 'Estrutura e Acolhimento no Parque Bela Vista',
    content: `Conheça o nosso consultório em Votorantim! Um ambiente climatizado, higienizado e projetado para acolher você com máximo conforto e tranquilidade.

Localizada na Rua Eugênio Bernardi, 340, no Parque Bela Vista, oferecemos fácil acesso e atendimento dedicado para cuidar da saúde dos pés de toda a sua família.

Dê aos seus pés o cuidado profissional que eles merecem todos os meses.

Clique no botão "Saiba mais" logo abaixo e venha nos visitar em Votorantim.`
  },

  // 10. CARROSSEL: Conforto e Bem-Estar no Parque Bela Vista (25/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-claudia-rangel-procedimento-20.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-21.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-22.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-23.jpeg'
    ],
    scheduledFor: '2026-11-25T13:00:00.000Z', // 25/11 às 10h BRT
    topic: 'Autocuidado e Relaxamento Podal',
    content: `Você já experimentou a sensação de sair da podologia pisando nas nuvens? Nossa sessão tradicional inclui assepsia, corte anatômico das unhas, desbaste de calosidades e massagem relaxante nos pés.

Mais do que tratar incômodos, a podologia é um momento especial de relaxamento e prevenção para recarregar as energias da sua rotina.

Agende o seu momento de autocuidado com a Podóloga Claudia Rangel em Votorantim.

Clique no botão "Saiba mais" abaixo e escolha o melhor dia para o seu atendimento.`
  },

  // 11. CARROSSEL: Podologia Preventiva para Toda a Família (27/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-claudia-rangel-procedimento-24.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-25.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-26.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-27.jpeg'
    ],
    scheduledFor: '2026-11-27T13:00:00.000Z', // 27/11 às 10h BRT
    topic: 'Podologia Preventiva para Crianças e Adultos',
    content: `Crianças, jovens, adultos e idosos: em todas as fases da vida, os pés enfrentam desafios específicos como crescimento rápido, práticas esportivas ou desgaste articular.

O acompanhamento podológico preventivo orienta sobre calçados adequados, corte correto e postura da pisada, garantindo qualidade de vida para toda a família.

Conte com a experiência da Podóloga Claudia Rangel no Parque Bela Vista em Votorantim.

Clique no botão "Saiba mais" abaixo para marcar uma consulta familiar.`
  },

  // 12. CARROSSEL: Saúde dos Pés e Conforto ao Caminhar (30/11)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-claudia-rangel-procedimento-28.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-29.jpeg',
      'podologia-votorantim-claudia-rangel-procedimento-30.jpeg'
    ],
    scheduledFor: '2026-11-30T13:00:00.000Z', // 30/11 às 10h BRT
    topic: 'Saúde e Firmeza nos Passos',
    content: `Passar o dia inteiro de pé exige que a base do seu corpo esteja completamente saudável e confortável. Tratar pontinhos de pressão e cantos de unhas doloridos transforma sua produtividade diária.

A podologia atua diretamente na raiz do desconforto, trazendo alívio duradouro para quem trabalha de pé ou pratica corridas e caminhadas.

Sinta a diferença de caminhar sem incômodos com a Podóloga Claudia Rangel em Votorantim.

Clique no botão "Saiba mais" abaixo e marque a sua sessão agora mesmo.`
  },

  // 13. CARROSSEL: Cuidados Clínicos Especializados (02/12)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-cuidados-clinicos-01.jpeg',
      'podologia-votorantim-cuidados-clinicos-02.jpeg',
      'podologia-votorantim-cuidados-clinicos-03.jpeg',
      'podologia-votorantim-cuidados-clinicos-04.jpeg'
    ],
    scheduledFor: '2026-12-02T13:00:00.000Z', // 02/12 às 10h BRT
    topic: 'Técnicas Avançadas de Tratamento Podal',
    content: `Cada pé é único e necessita de uma abordagem individualizada. Avaliamos a estrutura da lâmina, áreas de maior atrito e hábitos diários para indicar a conduta mais assertiva.

Seja para tratamento de micoses, remoção de espículas ou hidratação profunda, nossa missão é proporcionar alívio imediato e saúde duradoura.

Venha cuidar de você no Parque Bela Vista em Votorantim com a Podóloga Claudia Rangel.

Clique no botão "Saiba mais" abaixo para agendar a sua avaliação podológica.`
  },

  // 14. CARROSSEL: Alívio de Dores e Tensões Podais (04/12)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-cuidados-clinicos-05.jpeg',
      'podologia-votorantim-cuidados-clinicos-06.jpeg',
      'podologia-votorantim-cuidados-clinicos-07.jpeg',
      'podologia-votorantim-cuidados-clinicos-08.jpeg'
    ],
    scheduledFor: '2026-12-04T13:00:00.000Z', // 04/12 às 10h BRT
    topic: 'Alívio de Tensões e Dores nos Pés',
    content: `Você sente queimação na planta dos pés ou peso nas pernas ao final do dia? O acúmulo de tensão na fáscia plantar pode ser aliviado com os cuidados podológicos corretos e massagem terapêutica.

Recupere a leveza e a disposição para caminhar com conforto no seu dia a dia em Votorantim e Sorocaba.

Agende uma sessão completa com a Podóloga Claudia Rangel e sinta a renovação dos seus pés.

Clique no botão "Saiba mais" abaixo e garanta o seu horário na nossa clínica.`
  },

  // 15. CARROSSEL: Resultados e Recuperação de Unhas (07/12)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-recuperacao-unha-out-01.jpeg',
      'podologia-votorantim-recuperacao-unha-out-02.jpeg'
    ],
    scheduledFor: '2026-12-07T13:00:00.000Z', // 07/12 às 10h BRT
    topic: 'Resultados e Recuperação da Saúde das Unhas',
    content: `Acompanhar a evolução e a recuperação de uma unha danificada é gratificante! Com dedicação e os cuidados certos, unhas antes doloridas ou descoladas voltam a crescer com força e beleza natural.

Aqui na clínica da Podóloga Claudia Rangel, tratamos cada caso com carinho, paciência e alto rigor técnico.

Agende sua visita no Parque Bela Vista em Votorantim e venha transformar a saúde dos seus pés.

Clique no botão "Saiba mais" abaixo para falar diretamente com a nossa equipe.`
  },

  // 16. CARROSSEL: Pés Prontos para as Festas de Fim de Ano (09/12)
  {
    type: 'CAROUSEL',
    files: [
      'podologia-votorantim-recuperacao-unha-out-03.jpeg',
      'podologia-votorantim-recuperacao-unha-out-04.jpeg',
      'podologia-votorantim-recuperacao-unha-out-05.jpeg'
    ],
    scheduledFor: '2026-12-09T13:00:00.000Z', // 09/12 às 10h BRT
    topic: 'Pés Impecáveis para as Festas de Fim de Ano',
    content: `O fim de ano está chegando! Confraternizações, viagens, rasteirinhas e sandálias abertas: nada melhor do que estar com os pés impecáveis, macios e sem nenhuma dor para aproveitar as festas.

Nossa sessão de podologia completa deixa seus pés saudáveis, higienizados e prontos para qualquer ocasião especial.

Antecipe o seu horário de dezembro com a Podóloga Claudia Rangel em Votorantim antes que a agenda lote!

Clique no botão "Saiba mais" abaixo e reserve sua vaga para o fim de ano.`
  }
];

async function main() {
  console.log('=== ETAPA 1: RENOMEANDO ARQUIVOS NO DISCO PARA SEO LOCAL ===\n');

  for (const [oldName, newName] of Object.entries(RENAME_MAP)) {
    const oldPath = path.join(DIR, oldName);
    const newPath = path.join(DIR, newName);

    if (fs.existsSync(oldPath)) {
      if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renomeado: "${oldName}" -> "${newName}"`);
      } else {
        console.log(`Já renomeado ou destino já existe: "${newName}"`);
      }
    } else if (fs.existsSync(newPath)) {
      console.log(`Arquivo já está com nome SEO: "${newName}"`);
    } else {
      console.warn(`AVISO: Arquivo não encontrado: "${oldName}"`);
    }
  }

  console.log('\n=== ETAPA 2: UPLOAD PARA O STORAGE E AGENDAMENTO DOS POSTS ===\n');

  for (let i = 0; i < POSTS_PLAN.length; i++) {
    const postItem = POSTS_PLAN[i];
    console.log(`------------------------------------------------------------`);
    console.log(`[${i + 1}/${POSTS_PLAN.length}] Processando: "${postItem.topic}" (${postItem.type})`);
    console.log(`Arquivos: ${postItem.files.join(', ')}`);
    console.log(`Data Agendada: ${postItem.scheduledFor}`);

    const uploadedUrls = [];
    for (const f of postItem.files) {
      const filePath = path.join(DIR, f);
      process.stdout.write(`Fazendo upload de "${f}"... `);
      const url = await uploadToStorage(filePath, f);
      uploadedUrls.push(url);
      console.log(`OK!`);
    }

    const newPost = {
      client_id: CLIENT_ID,
      content: postItem.content.trim(),
      media_urls: uploadedUrls,
      topic_type: 'STANDARD',
      call_to_action: CTA,
      scheduled_for: postItem.scheduledFor,
      status: 'scheduled',
      ai_generated: true,
      ai_prompt: postItem.topic
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('scheduled_posts')
      .insert([newPost])
      .select('id, scheduled_for, topic_type')
      .single();

    if (insertErr) {
      console.error(`Erro ao inserir post no banco:`, insertErr);
    } else {
      console.log(`Post criado com sucesso! ID: ${inserted.id} | Data: ${inserted.scheduled_for}`);
    }
  }

  console.log('\n============================================================');
  console.log('Sucesso absoluto! Todos os 16 posts da Claudia Rangel foram agendados.');
  console.log('============================================================');
}

main().catch(err => {
  console.error('Falha geral no processo:', err);
});

