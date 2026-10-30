import { GoogleGenerativeAI } from '@google/generative-ai';
import { sql } from '../supabase/db.js';

let cachedSettings = null;
let lastSettingsFetch = 0;

/**
 * Fetch active AI configuration (model name + custom API key) with 30s cache
 */
export const DEFAULT_FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemma-4-26b-a4b-it',
];

export async function getActiveAiConfig() {
  const now = Date.now();
  if (cachedSettings && now - lastSettingsFetch < 30000) {
    return cachedSettings;
  }

  let modelName = 'gemini-flash-lite-latest';
  let apiKey = process.env.GEMINI_API_KEY;

  try {
    const list = await sql(`
      SELECT gemini_model, gemini_api_key
      FROM public.user_settings
      WHERE gemini_model IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1;
    `);
    if (list && list[0]) {
      if (list[0].gemini_model) modelName = list[0].gemini_model;
      const customKey = list[0].gemini_api_key?.trim();
      if (customKey && customKey.startsWith('AIza') && customKey.length >= 30) {
        apiKey = customKey;
      }
    }
  } catch (err) {
    console.warn('[Gemini Service] Could not fetch user_settings, using defaults:', err.message);
  }

  cachedSettings = { modelName, apiKey };
  lastSettingsFetch = now;
  return cachedSettings;
}

/**
 * Executes a generation request with automatic quota and service fallback cascade
 */
export async function generateAiContent(prompt, systemInstruction = null) {
  const { modelName, apiKey } = await getActiveAiConfig();
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(effectiveKey);

  // Build candidate models sequence starting with the chosen model,
  // followed by high-availability working models
  const candidates = [
    modelName,
    ...DEFAULT_FALLBACK_MODELS.filter((m) => m !== modelName),
  ];

  let lastError = null;

  for (let i = 0; i < candidates.length; i++) {
    const currentModelName = candidates[i];
    try {
      const modelInstance = genAI.getGenerativeModel({
        model: currentModelName,
        ...(systemInstruction ? { systemInstruction } : {}),
      });

      const result = await modelInstance.generateContent(prompt);
      const text = result.response.text();

      if (i > 0) {
        console.info(`[Gemini AI] Fallback model "${currentModelName}" succeeded after error on initial attempt.`);
      }

      return text;
    } catch (err) {
      lastError = err;
      const errMsg = err.message || '';
      const isRetryableError =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('503') ||
        errMsg.includes('Service Unavailable') ||
        errMsg.includes('500') ||
        errMsg.includes('404') ||
        errMsg.includes('models/') ||
        errMsg.includes('quota') ||
        errMsg.includes('high demand') ||
        errMsg.includes('limit:');

      if (!isRetryableError) {
        // Fatal non-retryable error (e.g. invalid syntax in prompt, blocked content)
        throw err;
      }

      console.warn(`[Gemini AI] Model "${currentModelName}" encountered retryable error: ${errMsg.slice(0, 120)}. Trying next model...`);
    }
  }

  throw lastError;
}

/**
 * Model proxy ensuring backward compatibility with all existing service methods
 */
const model = {
  generateContent: async (prompt) => {
    const text = await generateAiContent(prompt);
    return {
      response: {
        text: () => text,
      },
    };
  },
};

// ============================================
// POST GENERATION
// ============================================

/**
 * Generate a social post for a business
 * @param {Object} businessInfo - Business details (name, category, description)
 * @param {string} topic - Topic/theme for the post
 * @param {string} tone - Tone of voice (professional, casual, enthusiastic, etc.)
 * @param {string} type - Post type (STANDARD, EVENT, OFFER)
 */
export async function generatePost(businessInfo, topic, tone = 'profissional', type = 'STANDARD', extra = {}) {
  const prompt = buildPostPrompt(businessInfo, topic, tone, type, extra);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  try {
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    if (parsed.content && parsed.content.length > 1450) {
      const cut = parsed.content.slice(0, 1450);
      const lastPunct = Math.max(cut.lastIndexOf('\n\n'), cut.lastIndexOf('.'), cut.lastIndexOf('!'));
      if (lastPunct > 700) {
        parsed.content = cut.slice(0, lastPunct + 1).trim();
      }
    }
    return parsed;
  } catch {
    let content = text.trim();
    if (content.length > 1450) {
      const cut = content.slice(0, 1450);
      const lastPunct = Math.max(cut.lastIndexOf('\n\n'), cut.lastIndexOf('.'), cut.lastIndexOf('!'));
      if (lastPunct > 700) {
        content = cut.slice(0, lastPunct + 1).trim();
      }
    }
    return {
      content,
      hashtags: [],
      callToAction: null,
    };
  }
}

export function buildPostPrompt(businessInfo, topic, tone, type, extra = {}) {
  let typeInstructions = '';
  const specificTitle = extra.offerTitle || extra.eventTitle || extra.title || '';

  if (type === 'EVENT') {
    typeInstructions = `
- Tipo de Publicação: EVENTO no Google Meu Negócio.
${specificTitle ? `- Título do Evento: "${specificTitle}"` : ''}
- Na resposta JSON, inclua "eventTitle" com o nome atraente do evento (curto, máx. 58 caracteres) e direcione o texto para convidar o público para a data/ocasião.`;
  } else if (type === 'OFFER') {
    typeInstructions = `
- Tipo de Publicação: OFERTA / CONDIÇÃO ESPECIAL no Google Meu Negócio.
${specificTitle ? `- Título da Oferta: "${specificTitle}"` : ''}
- Na resposta JSON, inclua "offerTitle" com a chamada promocional clara (máx. 58 caracteres) e "offerTerms" com condições resumidas (ex: Válido até durarem os horários).`;
  }

  const city = businessInfo.city || businessInfo.location || '';
  const neighborhoods = businessInfo.neighborhoods || businessInfo.neighborhood || '';
  const localKwStr = Array.isArray(businessInfo.localKeywords) && businessInfo.localKeywords.length > 0
    ? businessInfo.localKeywords.slice(0, 5).join(', ')
    : '';

  const effectiveTheme = topic || specificTitle || 'Apresentação de serviços e novidades';

  return `Você é um redator sênior especialista em Google Meu Negócio (Google Business Profile) e SEO Local.
Sua missão é criar uma postagem altamente atrativa, profissional e 100% alinhada às DIRETRIZES OFICIAIS DO GOOGLE e ao que o usuário solicitou.

=== DADOS DA EMPRESA ===
- Empresa: ${businessInfo.name}
- Segmento / Especialidade: ${businessInfo.category || 'Serviços Especializados'}
- Cidade / Região: ${city || 'sua região'}
${neighborhoods ? `- Bairros / Área de Atendimento: ${neighborhoods}` : ''}
${businessInfo.description ? `- Perfil da Empresa: "${businessInfo.description.slice(0, 250)}"` : ''}
${localKwStr ? `- Palavras-chave locais secundárias: ${localKwStr}` : ''}
- Tom de voz: ${tone || 'profissional, acolhedor e persuasivo'}
${typeInstructions}

=== TEMA / IDEIA PRINCIPAL SOLICITADA PELO USUÁRIO ===
👉 "${effectiveTheme}"
${specificTitle && specificTitle !== effectiveTheme ? `👉 Título/Chamada informada pelo usuário: "${specificTitle}"` : ''}

⚠️ REGRA MÁXIMA DE FIDELIDADE AO TÓPICO (NÃO DESVIE):
1. Você DEVE focar 100% na ideia, título, serviço ou aviso acima que o usuário digitou.
2. NÃO fuja do assunto.
3. NÃO invente doenças, procedimentos ou temas aleatórios não solicitados.
4. NÃO use clichês ou palestras médicas/técnicas forçadas se o usuário apenas pediu um aviso, novidade, dica pontual ou promoção.
5. Desenvolva exatamente a mensagem que o usuário deseja passar para os clientes dele.

=== DIRETRIZES OFICIAIS DO GOOGLE BUSINESS PROFILE (ANTI-REJEIÇÃO) ===
1. NUNCA INCLUA NÚMEROS DE TELEFONE OU E-MAILS NO TEXTO:
   As diretrizes do Google Meu Negócio proíbem telefones (ex: (11) 99999-9999) ou e-mails no corpo do post e rejeitam publicações que contenham esses dados. O contato do cliente DEVE ser incentivado através do botão oficial (CTA).
2. NUNCA INCLUA LINKS OU URLs NO CORPO DO TEXTO:
   O Google não permite links (como https://... ou wa.me/...) dentro da mensagem. Toda ação deve ser feita pelo botão integrado do post.
3. NUNCA USE HASHTAGS (#):
   Hashtags não funcionam e não devem ser usadas no Google Meu Negócio.
4. SEM SENSACIONALISMO OU CAIXA ALTA EXCESSIVA:
   Evite palavras inteiras em maiúsculas (ex: "GRÁTIS", "URGENTE") e excesso de exclamações ("!!!"). Mantenha tom confiável e seguro.
5. CONTEXTO LOCAL NATURAL (SEM KEYWORD STUFFING):
   Mencione a cidade ou bairro no máximo 1 ou 2 vezes ao longo do texto de forma natural. Não faça listagens artificiais de bairros.
6. TAMANHO IDEAL PARA LEITURA NO CELULAR / GOOGLE MAPS:
   O texto deve ter entre 350 e 750 caracteres (máximo de 1.100 caracteres). Estruture em 2 a 3 parágrafos curtos, fluidos, separados por linha em branco, facilitando a leitura rápida no app do Google Maps.
7. CHAMADA PARA AÇÃO (CTA) INTEGRADA:
   Encerre com uma frase convidativa que oriente o leitor a usar o botão de ação logo abaixo (ex: "Toque no botão abaixo para agendar sua avaliação ou tirar dúvidas!").

Responda ESTRITAMENTE em formato JSON:
{
  "content": "Texto do post estruturado com parágrafos e emojis moderados conforme as diretrizes...",
  "callToAction": {
    "type": "BOOK | LEARN_MORE | CALL | SIGN_UP | ORDER",
    "label": "Texto do botão (ex: Saiba Mais, Agendar, Ligar)"
  },
  "suggestedImage": "Descrição curta da foto ou vídeo recomendado para acompanhar este post",
  "eventTitle": "Título do evento se for post do tipo EVENT",
  "offerTitle": "Título da oferta se for post do tipo OFFER",
  "offerTerms": "Termos da oferta se for post do tipo OFFER"
}`;
}

/**
 * Generate a bulk schedule of varied social posts for Google Business Profile
 */
export async function generateBulkPosts(businessInfo, focus, count = 5, tone = 'profissional', intervalDays = 3, startDateStr = null) {
  const city = businessInfo.city || businessInfo.location || '';
  const neighborhoods = businessInfo.neighborhoods || businessInfo.neighborhood || '';
  const localKwStr = Array.isArray(businessInfo.localKeywords) && businessInfo.localKeywords.length > 0
    ? businessInfo.localKeywords.slice(0, 6).join(', ')
    : '';

  const prompt = `Atue como redator sênior especialista em SEO Local e copywriting para o Google Meu Negócio (Google Business Profile).
Crie um lote estratégico de ${count} postagens persuasivas e 100% alinhadas às DIRETRIZES OFICIAIS DO GOOGLE para:

- Empresa: ${businessInfo.name}
- Nicho / Especialidade: ${businessInfo.category || 'Empresa Local'}
- Cidade: ${city || 'sua região'}
${neighborhoods ? `- Bairros de Atuação: ${neighborhoods}` : ''}
${businessInfo.description ? `- Perfil da Empresa: "${businessInfo.description.slice(0, 250)}"` : ''}
${localKwStr ? `- Palavras-chave locais prioritárias: ${localKwStr}` : ''}
- Foco da Campanha definido pelo usuário: "${focus || 'Engajamento, diferenciais e atração de clientes locais'}"
- Tom de voz: ${tone}

=== DIRETRIZES OBRIGATÓRIAS DO GOOGLE BUSINESS PROFILE (ANTI-REJEIÇÃO) ===
1. FIDELIDADE AO FOCO DA CAMPANHA:
   Todas as postagens devem respeitar rigorosamente o nicho real da empresa e o tema solicitado. NÃO invente doenças, procedimentos médicos ou temas não correspondentes.
2. NUNCA INCLUA NÚMEROS DE TELEFONE OU E-MAILS NO TEXTO:
   As políticas do Google rejeitam posts com telefones ou e-mails no corpo. O contato deve ser feito unicamente através do botão oficial (CTA).
3. NUNCA INCLUA LINKS OU URLs NO CORPO DO TEXTO:
   Proibido links ou wa.me no texto. Toda ação é pelo botão oficial do post.
4. NUNCA USE HASHTAGS (#):
   Hashtags não têm função no Google Meu Negócio e poluem o visual.
5. TAMANHO IDEAL PARA GOOGLE MAPS:
   Cada post deve ter entre 350 e 700 caracteres (máximo de 900 caracteres). Parágrafos curtos e leitura fluida no celular.
6. CONTEXTO LOCAL NATURAL:
   Mencione a cidade ou bairro no máximo 1 vez de forma orgânica.
7. PILARES VARIADOS DE CONTEÚDO (distribua entre os ${count} posts mantendo fidelidade ao tema):
   - Pilar 1: Dica Prática / Como funciona o serviço
   - Pilar 2: Diferencial de qualidade e atendimento
   - Pilar 3: Benefício direto para o cliente
   - Pilar 4: Por que escolher profissionais capacitados
   - Pilar 5: Convite direto para conhecer / agendar

Responda ESTRITAMENTE em formato JSON com o array "posts":
{
  "posts": [
    {
      "topic": "Tema específico deste post",
      "content": "Texto objetivo, acolhedor e persuasivo com quebras de linha e emojis moderados...",
      "topicType": "STANDARD",
      "callToAction": {
        "type": "BOOK | LEARN_MORE | CALL",
        "label": "Agendar Agora"
      }
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    const rawList = Array.isArray(parsed.posts) ? parsed.posts : (Array.isArray(parsed) ? parsed : []);

    const baseDate = startDateStr ? new Date(startDateStr) : new Date();
    return rawList.slice(0, count).map((p, idx) => {
      const postDate = new Date(baseDate.getTime() + (idx * intervalDays * 24 * 60 * 60 * 1000));
      postDate.setHours(10, 0, 0, 0);

      let content = p.content || '';
      if (content.length > 1450) {
        const cut = content.slice(0, 1450);
        const lastPunct = Math.max(cut.lastIndexOf('\n\n'), cut.lastIndexOf('.'), cut.lastIndexOf('!'));
        if (lastPunct > 700) {
          content = cut.slice(0, lastPunct + 1).trim();
        }
      }

      return {
        id: `gen_${Date.now()}_${idx}`,
        content,
        topic: p.topic || `Post ${idx + 1}`,
        topic_type: p.topicType || 'STANDARD',
        call_to_action: p.callToAction || { type: 'LEARN_MORE', label: 'Saiba Mais' },
        scheduled_for: postDate.toISOString(),
        publish_immediately: false,
        status: 'scheduled',
      };
    });
  } catch (err) {
    console.error('Error generating bulk posts with Gemini:', err);
    throw err;
  }
}

// ============================================
// REVIEW REPLY GENERATION
// ============================================

/**
 * Generate a suggested reply for a review
 * @param {Object} review - The review object (rating, comment, reviewer name)
 * @param {Object} businessInfo - Business details
 * @param {string} tone - Tone of voice
 */
export async function generateReviewReply(review, businessInfo, tone = 'profissional e acolhedor') {
  const prompt = `Você é um gerente de relacionamento com o cliente para o negócio "${businessInfo.name}" (${businessInfo.category || 'serviços gerais'}).

Um cliente deixou a seguinte avaliação no Google:

**Nome do cliente:** ${review.reviewerName || 'Cliente'}
**Nota:** ${'⭐'.repeat(review.rating)} (${review.rating}/5)
**Comentário:** "${review.comment || '(Sem comentário, apenas nota)'}"

Gere uma resposta ${tone} para esta avaliação.

REGRAS:
1. Agradeça sempre pelo feedback
2. Se a nota for >= 4, seja entusiasmado e convide a voltar
3. Se a nota for <= 2, seja empático, peça desculpas e ofereça resolver
4. Se a nota for 3, reconheça o feedback e prometa melhorar
5. Personalize com o nome do cliente se disponível
6. Mantenha entre 50-200 caracteres
7. Escreva em PT-BR
8. NÃO use emojis excessivos
9. Seja genuíno, não robótico

Responda APENAS com o texto da resposta, sem aspas ou formatação extra.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim().replace(/^["']|["']$/g, '');
}

// ============================================
// PHOTO CAPTION / ALT TEXT GENERATION
// ============================================

/**
 * Generate alt text / caption for a photo
 * @param {string} imageDescription - Description of what the image shows
 * @param {Object} businessInfo - Business details
 */
export async function generatePhotoCaption(imageDescription, businessInfo) {
  const prompt = `Gere um texto alternativo (alt text) otimizado para SEO para uma foto do negócio "${businessInfo.name}" (${businessInfo.category || 'negócio local'}).

Descrição da imagem: ${imageDescription}

REGRAS:
1. O alt text deve ter entre 30-125 caracteres
2. Inclua o nome do negócio naturalmente
3. Descreva a imagem de forma concisa e relevante
4. Otimize para buscas locais
5. Escreva em PT-BR

Responda APENAS com o texto, sem aspas ou formatação.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim().replace(/^["']|["']$/g, '');
}

// ============================================
// BUSINESS DESCRIPTION GENERATION
// ============================================

/**
 * Generate or optimize business profile description (strictly under 750 chars) for Google Business Profile
 * Supports both { name, category, location, services, currentDescription } and detailed config
 */
export async function generateBusinessDescription(options) {
  const businessName = options.businessName || options.name || 'Empresa';
  const category = options.category || 'Empresa Local';
  const secondaryCategories = options.secondaryCategories || [];
  const city = options.city || options.location || '';
  const neighborhood = options.neighborhood || '';
  const services = options.services || [];
  const tone = options.tone || 'persuasivo';
  const differential = options.differential || '';
  const existingDescription = options.existingDescription || options.currentDescription || '';

  const servicesList = Array.isArray(services) && services.length > 0
    ? services.slice(0, 8).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean).join(', ')
    : (typeof services === 'string' ? services : '');

  const toneGuidelines = {
    persuasivo: 'Focado em conversão, destacando benefícios imediatos, excelência e chamada para contato.',
    profissional: 'Tom corporativo, institucional, sério e de alta credibilidade.',
    acolhedor: 'Tom caloroso, humanizado, empático, transmitindo cuidado e atenção personalizada.',
    autoridade: 'Destaque para anos de experiência, especializações, padrão de referência e liderança no setor.',
  }[tone] || 'Persuasivo e focado em atrair e converter clientes locais.';

  const prompt = `Você é o maior especialista em SEO Local e copywriting para perfis de empresas no Google Meu Negócio (Google Business Profile) e Google Maps.
Crie uma descrição comercial de alto impacto para a ficha do Google da seguinte empresa:

**Nome da Empresa:** ${businessName}
**Categoria Principal:** ${category}
**Categorias Secundárias:** ${secondaryCategories.length > 0 ? secondaryCategories.join(', ') : 'Não informado'}
**Localização:** ${[neighborhood, city].filter(Boolean).join(', ') || 'Brasil'}
${servicesList ? `**Principais Serviços Oferecidos:** ${servicesList}` : ''}
${differential ? `**Diferencial Competitivo:** ${differential}` : ''}
${existingDescription ? `**Descrição Atual para Otimizar:** "${existingDescription}"` : ''}

**Tom de Voz Escolhido:** ${tone} (${toneGuidelines})

DIRETRIZES ESTRITAS DO GOOGLE BUSINESS PROFILE:
1. LIMITE RIGOROSO: Entre 500 e 720 caracteres (o Google aceita no máximo 750 caracteres; NUNCA ultrapasse 740 caracteres para total segurança).
2. SEO LOCAL NATURAL: Inclua o nicho/atividade principal e a cidade/bairro nos primeiros 250 caracteres, pois é o que aparece no resumo do Google Maps antes do "Ver mais".
3. ESTRUTURA IDEAL:
   - Parágrafo 1: Quem é a empresa, especialidade principal e localização.
   - Parágrafo 2: Serviços em destaque e diferenciais de qualidade/atendimento.
   - Parágrafo 3: Convite ou chamada para ação clara (ex: "Agende sua avaliação", "Venha nos visitar ou entre em contato").
4. PROIBIDO pelo Google GBP: NÃO inclua URLs/links de sites, NÃO coloque números de telefone com DDD dentro da descrição (o Google tem campos próprios para isso e pode rejeitar a edição), NÃO use caixa alta em palavras inteiras nem emojis excessivos (use no máximo 1 ou 2 se apropriado).

Responda APENAS com o texto da descrição pronta para ser colada na ficha, sem aspas, sem títulos e sem explicações.`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).trim();
    }
    return text.slice(0, 745);
  } catch (err) {
    console.error('[Gemini Business Description] Error:', err.message);
    const srvText = servicesList ? ` Especializada em ${servicesList}.` : '';
    const locText = city ? ` em ${city}` : '';
    return `${businessName} é referência em ${category || 'atendimento'}${locText}.${srvText} Oferecemos atendimento qualificado, infraestrutura moderna e total dedicação ao bem-estar e à satisfação dos nossos clientes. Entre em contato conosco e agende seu horário ou solicite um orçamento personalizado!`.slice(0, 740);
  }
}


// ============================================
// LOCAL SEO AUDIT & OPTIMIZATION
// ============================================

/**
 * Generate a comprehensive Local SEO audit and optimization proposal
 * @param {Object} profile - Full client profile details
 */
export async function generateLocalSeoAudit(profile) {
  const prompt = `Você é um dos maiores especialistas do mundo em SEO Local e Google Meu Negócio (Google Business Profile).
Sua missão é analisar os dados da ficha a seguir e fornecer um diagnóstico profissional e um plano de otimização acionável para colocar essa empresa nas 3 primeiras posições do Google Maps (Local 3-Pack).

**Dados da Ficha:**
- **Nome:** ${profile.name}
- **Categoria Principal:** ${profile.category || 'Não definida'}
- **Endereço/Cidade:** ${profile.city || profile.address || 'Não especificada'}
- **Telefone:** ${profile.phone || 'Não informado'}
- **Site:** ${profile.website || 'Não informado'}
- **Avaliações Totais:** ${profile.totalReviews || 0}
- **Nota Média:** ${profile.averageRating || 'Sem nota'}
- **Taxa de Resposta a Reviews:** ${profile.responseRate || 0}%
- **Último Post:** ${profile.lastPostDaysAgo !== null ? `${profile.lastPostDaysAgo} dias atrás` : 'Nunca postou'}
- **Descrição Atual:** "${profile.currentDescription || 'Sem descrição cadastrada'}"

INSTRUÇÕES OBRIGATÓRIAS:
1. Retorne APENAS um JSON válido.
2. Seja específico para o nicho e localização da empresa.
3. A nova descrição otimizada ("optimizedDescription") DEVE:
   - Ter entre 450 e 740 caracteres (o limite do Google é 750).
   - Conter palavras-chave estratégicas locais que os clientes buscam.
   - Destacar os diferenciais, autoridade e serviços principais.
   - Concluir com uma chamada para ação clara (ex: "Entre em contato pelo WhatsApp ou visite nosso estabelecimento").
   - NÃO conter links/URLs nem preços.

Responda APENAS com este formato JSON:
{
  "seoDiagnostic": "Diagnóstico claro de 2 a 3 parágrafos explicando os pontos fortes, as principais falhas da ficha atual no algoritmo do Google Maps e o potencial de crescimento.",
  "recommendedSecondaryCategories": [
    "Categoria Oficial GBP 1",
    "Categoria Oficial GBP 2",
    "Categoria Oficial GBP 3"
  ],
  "localKeywords": [
    "palavra-chave 1",
    "palavra-chave 2",
    "palavra-chave 3",
    "palavra-chave 4",
    "palavra-chave 5",
    "palavra-chave 6"
  ],
  "optimizedDescription": "Nova descrição altamente persuasiva e otimizada com palavras-chave locais respeitando rigorosamente os limites do Google Meu Negócio...",
  "actionPlan": [
    {
      "priority": "Alta | Média | Baixa",
      "action": "Título da ação",
      "impact": "Explicação do impacto no ranqueamento local"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[Gemini SEO Audit] Error:', err);
    return {
      seoDiagnostic: `Análise para ${profile.name}: É essencial manter a ficha atualizada com categorias secundárias, palavras-chave locais na descrição e responder a todas as avaliações para conquistar o topo do Google Maps.`,
      recommendedSecondaryCategories: [profile.category || 'Serviços'],
      localKeywords: [`${profile.category || 'serviço'} ${profile.city || ''}`.trim()],
      optimizedDescription: profile.currentDescription || `Conheça ${profile.name}, referência em ${profile.category || 'serviços de qualidade'}. Atendimento especializado com foco na satisfação de nossos clientes. Entre em contato e saiba mais!`,
      actionPlan: [
        { priority: 'Alta', action: 'Atualizar descrição da ficha com palavras-chave', impact: 'Aumenta a relevância para buscas diretas no Maps' },
        { priority: 'Alta', action: 'Responder avaliações pendentes', impact: 'Melhora a pontuação de engajamento do perfil' }
      ]
    };
  }
}

// ============================================
// SERVICE DESCRIPTION GENERATION WITH AI
// ============================================

/**
 * Generate a high-conversion description for a single service (Google My Business limit is 300 chars)
 */
/**
 * Generate a high-conversion description for a single service grounded in Local SEO and business context
 */
export async function generateServiceDescription({
  businessName,
  category,
  secondaryCategories = [],
  city,
  neighborhood,
  neighborhoods,
  serviceName,
  existingDescription,
  businessBio = '',
  localKeywords = [],
  seoDiagnostic = '',
  maxLength = 290,
  extended = false,
}) {
  const localKwStr = Array.isArray(localKeywords) && localKeywords.length > 0
    ? localKeywords.slice(0, 6).join(', ')
    : '';

  const secCatStr = Array.isArray(secondaryCategories) && secondaryCategories.length > 0
    ? secondaryCategories.slice(0, 4).join(', ')
    : '';

  const effectiveNeighborhoods = neighborhoods || neighborhood || '';

  const charRule = extended
    ? 'Tamanho: Até 600 caracteres expandidos.'
    : 'Tamanho: Limite RIGOROSO de 300 caracteres da API do Google Meu Negócio. Escreva um texto fluido, persuasivo e completo entre 220 e 280 caracteres (NUNCA ultrapasse 290 caracteres). A última frase deve terminar com ponto ou exclamação antes do limite.';

  const prompt = `Atue como especialista em SEO Local para o Google Meu Negócio (Google Business Profile).
Escreva a descrição oficial para o item do catálogo de serviços: "${serviceName}".

Dados do Negócio:
- Serviço: ${serviceName}
${category ? `- Nicho/Especialidade: ${category}${secCatStr ? ` (${secCatStr})` : ''}` : ''}
${businessName ? `- Empresa: ${businessName}` : ''}
- Cidade: ${city || 'sua cidade'}
${effectiveNeighborhoods ? `- Bairros de Atuação (Opcional): ${effectiveNeighborhoods}` : ''}
${businessBio ? `- Perfil da Empresa: "${businessBio.slice(0, 200)}"` : ''}
${localKwStr ? `- Palavras-chave locais relevantes: ${localKwStr}` : ''}
${existingDescription ? `- Descrição atual: "${existingDescription}"` : ''}

Regras de Escrita:
1. ${charRule}
2. Estrutura: Foque no benefício imediato (alívio/solução) + diferencial técnico com termos especializados + contexto local natural (${city || 'região'}) + chamada para ação curta no final (ex: "Agende sua avaliação!" ou "Marque seu horário!").
3. SEO Semântico: Identifique e inclua 2 a 3 termos técnicos reais que especialistas da área usam para este procedimento.
4. Contexto Local: Incorpore a cidade e os bairros de forma fluida.
5. Proibido clichês genéricos (como "ambiente acolhedor", "equipe qualificada", "atendimento de excelência"). Seja direto, profissional e focado no resultado para o cliente.
6. Sem aspas, sem títulos (não use "Benefício:", "Diferencial:") e sem explicações.

Responda APENAS com o texto final da descrição pronta.`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^["']|["']$/g, '').trim();
    const effectiveMax = extended ? 1400 : (maxLength || 295);
    if (text.length > effectiveMax) {
      const cut = text.slice(0, effectiveMax);
      const lastPunct = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
      if (lastPunct >= 120) {
        text = cut.slice(0, lastPunct + 1).trim();
      } else {
        const lastSpace = cut.lastIndexOf(' ');
        const cleanBase = (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\-\s]+$/, '').trim();
        text = cleanBase.endsWith('.') || cleanBase.endsWith('!') ? cleanBase : `${cleanBase}!`;
      }
    }
    return text;
  } catch (err) {
    console.error('[Gemini Service Description] Error:', err.message);
    const locPart = effectiveNeighborhoods
      ? ` em ${city || 'sua região'} (${effectiveNeighborhoods})`
      : city
      ? ` em ${city}`
      : '';
    const lower = (serviceName || '').toLowerCase();
    if (lower.includes('unha') || lower.includes('encravada') || lower.includes('onicocriptose')) {
      return `Alívio imediato da unha encravada com espiculotomia precisa, remoção de espícula e assepsia rigorosa${locPart}. Recupere seu bem-estar sem dor. Agende sua avaliação!`;
    }
    if (lower.includes('calo') || lower.includes('plantar') || lower.includes('rachadura') || lower.includes('heloma')) {
      return `Remoção especializada de calosidades e hiperqueratose com desbastamento laminar e hidratação profunda${locPart}. Conforto ao caminhar. Agende seu atendimento!`;
    }
    if (lower.includes('laser') || lower.includes('micose') || lower.includes('onicomicose')) {
      return `Eliminação de micose ungueal com laserterapia avançada, terapia fotodinâmica e ação fungicida profunda${locPart}. Unhas saudáveis e regeneradas. Agende sua sessão!`;
    }
    if (lower.includes('órtese') || lower.includes('ortese') || lower.includes('curvatura')) {
      return `Correção da curvatura ungueal com órtese metálica, tração mecânica e ortonixia preventiva${locPart}. Elimine a dor da pressão nas unhas. Marque seu horário!`;
    }
    return `Procedimento especializado de ${serviceName} com biossegurança, instrumentos esterilizados e conduta técnica focada no seu alívio${locPart}. Agende sua avaliação!`;
  }
}

/**
 * Generate descriptions for ALL services in bulk with individualized, non-generic AI prompts
 */
export async function generateAllServicesDescriptions({
  businessName,
  category,
  secondaryCategories = [],
  city,
  neighborhood,
  neighborhoods,
  services,
  businessBio = '',
  localKeywords = [],
  maxLength = 290,
  extended = false,
}) {
  if (!services || services.length === 0) return [];

  // Generate each pending service individually in parallel batches of 3
  // This guarantees that every service receives a 100% unique, procedure-specific,
  // localized description without relying on generic JSON lists or cookie-cutter templates.
  const updatedServices = [];
  const batchSize = 3;

  for (let i = 0; i < services.length; i += batchSize) {
    const batch = services.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (service) => {
        try {
          const desc = await generateServiceDescription({
            businessName,
            category: service.category || category,
            secondaryCategories,
            city,
            neighborhood,
            neighborhoods,
            serviceName: service.name,
            existingDescription: service.description,
            businessBio,
            localKeywords,
            maxLength,
            extended,
          });

          return {
            ...service,
            description: desc || service.description,
          };
        } catch (itemErr) {
          console.error(`[Bulk Services] Error on "${service.name}":`, itemErr.message);
          return service;
        }
      })
    );

    updatedServices.push(...batchResults);

    // Micro-delay between batches to prevent upstream Google API rate limits
    if (i + batchSize < services.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return updatedServices;
}

/**
 * Suggest popular high-demand services for a business niche grounded in local competitor searches
 */
export async function suggestServicesForNiche({
  businessName,
  category,
  secondaryCategories = [],
  city,
  neighborhood,
  neighborhoods,
  localKeywords = [],
}) {
  const effectiveNeighborhoods = neighborhoods || neighborhood || '';
  const kwStr = Array.isArray(localKeywords) && localKeywords.length > 0 ? localKeywords.slice(0, 6).join(', ') : '';

  const prompt = `Atue como especialista em SEO Local e inteligência de mercado no Google Meu Negócio.
Para a empresa "${businessName}" (${category || 'Comércio e Serviços'}), localizada em ${effectiveNeighborhoods ? `${effectiveNeighborhoods}, ` : ''}${city || 'Brasil'}, sugira de 5 a 8 dos serviços mais procurados no Google Maps.
${kwStr ? `Palavras-chave locais em alta: ${kwStr}` : ''}

Regras de Escrita para cada serviço sugerido:
1. "name": Nome comercial claro e exato mais buscado pelos clientes no Google.
2. "category": Categoria ou especialidade correspondente.
3. "price": Preço de referência aproximado (ex: "Sob consulta", "A partir de R$ 90", "120,00").
4. "description": Descrição de 180 a 280 caracteres focada na Estrutura (benefício + diferencial técnico com 3 termos técnicos do setor + chamada para ação curta) e Contexto Local (${city || 'região'} e bairros) de forma natural.

Responda APENAS em formato JSON:
{
  "services": [
    {
      "name": "Nome do Serviço",
      "category": "Categoria",
      "price": "Sob consulta",
      "description": "Benefício + diferencial com termos técnicos + chamada para ação curta"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const services = Array.isArray(parsed.services) ? parsed.services : [];
    return services.map((s) => {
      let desc = (s.description || '').trim();
      if (desc.length > 295) {
        const cut = desc.slice(0, 295);
        const lastPunct = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
        desc = lastPunct >= 120 ? cut.slice(0, lastPunct + 1).trim() : cut.trim();
      }
      return {
        ...s,
        description: desc,
      };
    });
  } catch (err) {
    console.error('[Gemini Suggest Services] Error:', err.message);
    return [
      {
        name: `Atendimento Especializado`,
        category: category || 'Geral',
        price: 'Sob consulta',
        description: `Procedimento especializado com avaliação minuciosa e biossegurança em ${city || 'clínica equipada'}. Agende seu horário com segurança!`,
      },
    ];
  }
}

/**
 * Parse raw text list of services and generate full catalog with descriptions & categories via AI
 */
export async function parseAndGenerateBulkServices({
  businessName,
  category,
  secondaryCategories = [],
  city,
  neighborhood,
  neighborhoods,
  rawText,
  businessBio = '',
  localKeywords = [],
}) {
  if (!rawText || !rawText.trim()) return [];

  const effectiveNeighborhoods = neighborhoods || neighborhood || '';
  const kwStr = Array.isArray(localKeywords) && localKeywords.length > 0 ? localKeywords.slice(0, 6).join(', ') : '';

  const prompt = `Atue como especialista em SEO Local. Escreva descrições de serviço de alta conversão para o Google Meu Negócio da empresa "${businessName}".

Dados do Negócio:
- Nicho/Especialidade: ${category || 'Serviços'}
- Cidade: ${city || 'Brasil'}
${effectiveNeighborhoods ? `- Bairros (Opcional): ${effectiveNeighborhoods}` : ''}
${businessBio ? `- Perfil da Empresa: "${businessBio.slice(0, 200)}"` : ''}
${kwStr ? `- Palavras-chave locais prioritárias: ${kwStr}` : ''}

LISTA DE SERVIÇOS INFORMADA:
"""
${rawText}
"""

Regras de Escrita para CADA serviço:
1. Extraia o nome do serviço e corrija pontuação/caixa alta.
2. Estrutura: Foque no benefício + diferencial técnico + chamada para ação curta.
3. SEO Semântico: Identifique e inclua 3 termos técnicos que especialistas da área usam para cada procedimento.
4. Contexto Local: Incorpore a cidade e bairros de forma natural.
5. Tamanho: Limite estrito de até 280-290 caracteres (compatível com o catálogo do Google Meu Negócio).
6. Proibido clichês genéricos e repetidos.

Responda APENAS em formato JSON:
{
  "services": [
    {
      "name": "Nome do Serviço",
      "category": "Subcategoria",
      "price": "Sob consulta",
      "description": "Descrição com benefício + 3 termos técnicos + contexto local + chamada para ação curta"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const locPart = city ? ` em ${city}` : '';
    return (parsed.services || []).map((s, idx) => {
      let desc = (s.description || `${s.name} com avaliação clínica, esterilização hospitalar e protocolo específico${locPart}. Agende sua avaliação!`).trim();
      if (desc.length > 295) {
        const cut = desc.slice(0, 295);
        const lastPunct = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
        desc = lastPunct >= 120 ? cut.slice(0, lastPunct + 1).trim() : cut.trim();
      }
      return {
        id: `srv_${Date.now()}_${idx}`,
        name: s.name || `Serviço ${idx + 1}`,
        category: s.category || category || 'Geral',
        price: s.price || 'Sob consulta',
        description: desc,
        photo_url: '',
      };
    });
  } catch (err) {
    console.error('[Gemini Parse Bulk Services] Error:', err.message);
    const lines = rawText.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 2);
    const locPart = city ? ` em ${city}` : '';
    return lines.map((name, idx) => ({
      id: `srv_${Date.now()}_${idx}`,
      name,
      category: category || 'Serviços',
      price: 'Sob consulta',
      description: `${name} com conduta especializada e biossegurança rigorosa${locPart}. Entre em contato e garanta seu agendamento!`.slice(0, 290),
      photo_url: '',
    }));
  }
}


/**
 * Deep Competitor Analysis & Outranking Strategy for Google Business Profile
 */
export async function generateCompetitorAnalysis({
  businessName,
  category,
  secondaryCategories = [],
  city,
  averageRating = 0,
  totalReviews = 0,
  totalPhotos = 0,
  hasWebsite = false,
  description = '',
}) {
  const prompt = `Você é o maior especialista em SEO Local e inteligência competitiva no Google Meu Negócio (Google Business Profile) e Google Maps.
Faça uma análise profunda de concorrência e crie uma estratégia prática para SUPERAR os concorrentes diretos no Google Maps da seguinte empresa:

**Dados da Empresa:**
- **Nome:** ${businessName}
- **Categoria Principal:** ${category || 'Serviços'}
- **Categorias Secundárias Atuais:** ${secondaryCategories.length > 0 ? secondaryCategories.join(', ') : 'Nenhuma'}
- **Cidade / Região:** ${city || 'Brasil'}
- **Avaliações Atuais:** ${totalReviews} avaliações
- **Nota Média:** ${averageRating > 0 ? `${averageRating} ★` : 'Sem nota'}
- **Fotos Cadastradas:** ${totalPhotos} fotos
- **Possui Website:** ${hasWebsite ? 'Sim' : 'Não'}
- **Descrição Atual:** "${description ? description.slice(0, 200) + '...' : 'Sem descrição'}"

**SEU OBJETIVO:**
1. Mapear 3 a 4 concorrentes diretos realistas que disputam o topo do "Local 3-Pack" do Google Maps no mesmo nicho e cidade (${city || 'região'}).
2. Mapear os pontos fortes e as vulnerabilidades/brechas desses concorrentes que nossa empresa pode explorar.
3. Entregar um plano de ação tático e prático respondendo: "O que fazer nesta ficha para superar esses concorrentes e assumir a liderança no Google Maps".

REGRAS OBRIGATÓRIAS:
- Retorne APENAS um JSON válido. Sem formatações markdown fora do bloco json.
- As categorias sugeridas devem ser categorias oficiais existentes no Google Meu Negócio.
- O plano de superação deve ser altamente aplicável com dados, metas e ações práticas.

Formato JSON esperado:
{
  "benchmarkSummary": {
    "status": "Desafiante com Alto Potencial",
    "marketDifficulty": "Média",
    "avgCompetitorRating": 4.7,
    "avgCompetitorReviews": 85,
    "leaderReviews": 130,
    "reviewsNeededToOutrank": 35,
    "marketOverview": "Resumo de 2 a 3 frases sobre a concorrência na região e oportunidades abertas."
  },
  "competitors": [
    {
      "name": "Nome do Concorrente",
      "rating": 4.8,
      "reviewCount": 110,
      "primaryCategory": "Categoria",
      "secondaryCategories": ["Cat 1", "Cat 2"],
      "estimatedPhotos": "50+ fotos",
      "strengths": ["Ponto forte 1", "Ponto forte 2"],
      "vulnerabilities": ["Vulnerabilidade 1", "Vulnerabilidade 2"]
    }
  ],
  "strategyToOutrank": {
    "title": "Plano Tático para Superar Concorrentes no Google Maps",
    "categoriesStrategy": {
      "missingRecommendedCategories": [
        "Categoria GBP 1",
        "Categoria GBP 2",
        "Categoria GBP 3"
      ],
      "explanation": "Explicação de impacto das categorias secundárias."
    },
    "reviewsStrategy": {
      "targetReviewCount": 120,
      "reviewsToSurpassLeader": 30,
      "weeklyPace": "3 a 4 avaliações por semana",
      "estimatedTimeToLead": "6 a 8 semanas",
      "reviewTactics": [
        "Tática prática 1",
        "Tática prática 2"
      ]
    },
    "contentAndPhotosStrategy": {
      "targetWeeklyPhotos": 4,
      "targetWeeklyPosts": 2,
      "recommendedPhotoTypes": [
        "Tipo de foto 1",
        "Tipo de foto 2",
        "Tipo de foto 3"
      ],
      "postStrategyTip": "Dica de postagem semanal para o algoritmo GBP."
    },
    "quickWins": [
      {
        "id": "qw_1",
        "title": "Título do Quick Win 1",
        "impact": "Muito Alto",
        "time": "5 min",
        "action": "Ação clara passo a passo.",
        "category": "Categorias"
      },
      {
        "id": "qw_2",
        "title": "Título do Quick Win 2",
        "impact": "Alto",
        "time": "10 min",
        "action": "Ação clara passo a passo.",
        "category": "Avaliações"
      },
      {
        "id": "qw_3",
        "title": "Título do Quick Win 3",
        "impact": "Alto",
        "time": "5 min",
        "action": "Ação clara passo a passo.",
        "category": "Fotos"
      }
    ]
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[Gemini Competitor Analysis] Error:', err);
    // Graceful fallback benchmark
    const estLeaderReviews = Math.max(80, totalReviews + 35);
    const needed = Math.max(15, estLeaderReviews - totalReviews + 5);
    return {
      benchmarkSummary: {
        status: totalReviews > 50 ? 'Competidor Forte' : 'Desafiante com Alto Potencial',
        marketDifficulty: 'Média',
        avgCompetitorRating: 4.6,
        avgCompetitorReviews: Math.max(45, Math.round(totalReviews * 1.4)),
        leaderReviews: estLeaderReviews,
        reviewsNeededToOutrank: needed,
        marketOverview: `No nicho de ${category || 'serviços'} em ${city || 'sua região'}, os concorrentes líderes se destacam pelo volume contínuo de avaliações e categorias secundárias completas. Com as otimizações certas, sua ficha pode subir diretamente para o Top 3.`,
      },
      competitors: [
        {
          name: `Líder Regional ${category || 'Local'}`,
          rating: 4.8,
          reviewCount: estLeaderReviews,
          primaryCategory: category || 'Comércio Local',
          secondaryCategories: ['Serviço Especializado', 'Atendimento Comercial'],
          estimatedPhotos: '65+ fotos',
          strengths: ['Volume expressivo de avaliações', 'Perfil antigo e consolidado'],
          vulnerabilities: ['Não responde reviews negativos', 'Pouca frequência de postagens semanais', 'Descrição sem foco em SEO regional'],
        },
        {
          name: `Concorrente Direto ${city ? city.split(',')[0] : 'Centro'}`,
          rating: 4.5,
          reviewCount: Math.round(estLeaderReviews * 0.7),
          primaryCategory: category || 'Serviços',
          secondaryCategories: ['Consultoria Especializada'],
          estimatedPhotos: '30 fotos',
          strengths: ['Boa localização no centro', 'Atendimento elogiado'],
          vulnerabilities: ['Falta de categorias secundárias', 'Poucas fotos recentes', 'Sem catálogo completo de serviços'],
        },
      ],
      strategyToOutrank: {
        title: 'Plano Tático para Superar Concorrentes no Google Maps',
        categoriesStrategy: {
          missingRecommendedCategories: [
            category ? `${category} Especializado` : 'Serviços Especializados',
            'Atendimento Comercial',
            'Prestador de Serviços',
          ],
          explanation: 'Adicionar até 5 categorias secundárias permite que sua empresa seja encontrada em mais de 12 buscas complementares no Google Maps.',
        },
        reviewsStrategy: {
          targetReviewCount: estLeaderReviews + 5,
          reviewsToSurpassLeader: needed,
          weeklyPace: '3 a 5 novas avaliações por semana',
          estimatedTimeToLead: '6 a 8 semanas',
          reviewTactics: [
            'Envie o link direto de avaliação via WhatsApp logo após a conclusão do serviço ou compra.',
            'Responda todas as avaliações incluindo o nome do serviço realizado e a cidade/bairro para reforçar o algoritmo de SEO local.',
          ],
        },
        contentAndPhotosStrategy: {
          targetWeeklyPhotos: 3,
          targetWeeklyPosts: 2,
          recommendedPhotoTypes: [
            'Fotos nítidas da fachada externa e ambiente interno',
            'Fotos de produtos ou serviços finalizados (resultados reais)',
            'Fotos da equipe prestando atendimento com uniforme ou crachá',
          ],
          postStrategyTip: 'Crie pelo menos 1 post semanal com botão de chamada para ação (Ligar Agora ou WhatsApp). Fichas ativas recebem prioridade no ranqueamento.',
        },
        quickWins: [
          {
            id: 'qw_1',
            title: 'Adicionar Categorias Secundárias Ausentes',
            impact: 'Muito Alto',
            time: '3 min',
            action: 'Vá na aba "Editar Ficha Completa" e adicione pelo menos 2 a 3 categorias secundárias do seu nicho.',
            category: 'Categorias',
          },
          {
            id: 'qw_2',
            title: 'Solicitar Avaliações aos Últimos 5 Clientes',
            impact: 'Muito Alto',
            time: '10 min',
            action: 'Envie o link do Google por WhatsApp para clientes atendidos recentemente pedindo 5 estrelas.',
            category: 'Avaliações',
          },
          {
            id: 'qw_3',
            title: 'Adicionar 3 Novas Fotos da Fachada e Serviços',
            impact: 'Alto',
            time: '5 min',
            action: 'Suba fotos recentes do seu espaço ou produtos na aba Serviços/Fotos para aumentar visualizações.',
            category: 'Fotos',
          },
        ],
      },
    };
  }
}

// ============================================
// PRODUCT DESCRIPTION & CATALOG GENERATION (GBP PRODUCTS)
// ============================================

/**
 * Generate a high-conversion description for a product in Google Business Profile (up to 1,000 chars)
 */
export async function generateProductDescription({
  businessName,
  category,
  city,
  neighborhood,
  neighborhoods,
  productName,
  productCategory,
  price,
  existingDescription,
  businessBio = '',
  localKeywords = [],
}) {
  const effectiveNeighborhoods = neighborhoods || neighborhood || '';
  const kwStr = Array.isArray(localKeywords) && localKeywords.length > 0 ? localKeywords.slice(0, 6).join(', ') : '';

  const prompt = `Atue como copywriter especialista em e-commerce e SEO Local para o Google Meu Negócio (Google Business Profile Products).
Escreva uma descrição comercial envolvente e persuasiva para o produto a seguir:

Dados do Produto:
- Nome do Produto: ${productName}
${productCategory ? `- Categoria do Produto: ${productCategory}` : ''}
${price ? `- Preço: ${price}` : ''}
${businessName ? `- Empresa/Loja: ${businessName}` : ''}
${category ? `- Nicho: ${category}` : ''}
- Cidade: ${city || 'sua cidade'}
${effectiveNeighborhoods ? `- Bairros de Atendimento: ${effectiveNeighborhoods}` : ''}
${businessBio ? `- Sobre a Empresa: "${businessBio.slice(0, 200)}"` : ''}
${kwStr ? `- Palavras-chave relevantes: ${kwStr}` : ''}
${existingDescription ? `- Descrição atual: "${existingDescription}"` : ''}

DIRETRIZES DO GOOGLE MEU NEGÓCIO PARA PRODUTOS:
1. TAMANHO: Desenvolva um texto completo entre 350 e 750 caracteres (o limite da plataforma é de 1.000 caracteres; NUNCA ultrapasse 950 caracteres).
2. ESTRUTURA DE ALTA CONVERSÃO:
   - Gancho inicial focado na dor, benefício imediato ou transformação que o produto proporciona.
   - Detalhes de qualidade: composição, ativos, materiais de excelência ou tecnologia aplicada.
   - Modo de uso ou recomendação de indicação prática.
   - Chamada para ação clara convidando para pedir pelo WhatsApp, retirar na loja ou solicitar entrega.
3. Não use hashtags (#). Use emojis com moderação profissional.
4. Sem aspas, sem títulos internos (não use "Benefício:", "Composição:") e sem explicações.

Responda APENAS com o texto da descrição do produto pronto para publicação.`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^["']|["']$/g, '').trim();

    if (text.length > 950) {
      const cut = text.slice(0, 950);
      const lastPunct = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
      if (lastPunct >= 300) {
        text = cut.slice(0, lastPunct + 1).trim();
      } else {
        text = cut.slice(0, 940).trim() + '!';
      }
    }
    return text;
  } catch (err) {
    console.error('[Gemini Product Description] Error:', err.message);
    const locPart = city ? ` em ${city}` : '';
    return `${productName} de alta qualidade disponível na ${businessName || 'nossa loja'}${locPart}. Formulado com ingredientes selecionados para proporcionar máxima eficácia, proteção e bem-estar. Ideal para o seu dia a dia e cuidados especiais. Garanta o seu pelo WhatsApp ou retire diretamente em nossa unidade!`;
  }
}

/**
 * Suggest trending and high-margin products for a business niche
 */
export async function suggestProductsForNiche({
  businessName,
  category,
  city,
  neighborhood,
  neighborhoods,
  localKeywords = [],
}) {
  const effectiveNeighborhoods = neighborhoods || neighborhood || '';
  const kwStr = Array.isArray(localKeywords) && localKeywords.length > 0 ? localKeywords.slice(0, 6).join(', ') : '';

  const prompt = `Atue como consultor de merchandising e SEO Local no Google Meu Negócio.
Para a empresa "${businessName}" (${category || 'Comércio e Serviços'}), localizada em ${effectiveNeighborhoods ? `${effectiveNeighborhoods}, ` : ''}${city || 'Brasil'}, sugira de 5 a 7 dos produtos físicos mais lucrativos e buscados pelos clientes no Google Maps.
${kwStr ? `Palavras-chave locais relevantes: ${kwStr}` : ''}

Regras para cada produto:
1. "name": Nome claro, comercial e atrativo (máximo 58 caracteres).
2. "category": Categoria do produto (ex: Cuidados Diários, Ortopedia, Suplementos, Acessórios).
3. "price": Preço médio de mercado em reais (ex: "49,90", "89,00").
4. "promoPrice": Preço promocional opcional (ou null).
5. "description": Descrição comercial de 300 a 600 caracteres focada em benefícios, qualidade e chamada para compra.

Responda ESTRITAMENTE em formato JSON:
{
  "products": [
    {
      "name": "Nome do Produto",
      "category": "Categoria",
      "price": "59,90",
      "promoPrice": "49,90",
      "description": "Texto persuasivo com benefícios e chamada..."
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed.products) ? parsed.products : [];

    return list.map((p, idx) => ({
      id: `prod_${Date.now()}_${idx}`,
      name: p.name || `Produto ${idx + 1}`,
      category: p.category || 'Geral',
      price: p.price || 'Sob consulta',
      promo_price: p.promoPrice || '',
      description: p.description || '',
      photo_url: '',
      button_type: 'ORDER',
      button_url: '',
      is_active: true,
    }));
  } catch (err) {
    console.error('[Gemini Suggest Products] Error:', err.message);
    return [
      {
        id: `prod_${Date.now()}_0`,
        name: 'Kit Tratamento Especializado',
        category: 'Cuidados Especiais',
        price: '89,90',
        promo_price: '79,90',
        description: `Kit completo para cuidados diários e prevenção, com formulação de alta absorção e eficácia comprovada. Peça pelo WhatsApp e receba com agilidade!`,
        photo_url: '',
        button_type: 'ORDER',
        button_url: '',
        is_active: true,
      },
    ];
  }
}

/**
 * Parse raw text list of products and generate full catalog
 */
export async function parseAndGenerateBulkProducts({
  businessName,
  category,
  city,
  neighborhood,
  neighborhoods,
  rawText,
  businessBio = '',
  localKeywords = [],
}) {
  if (!rawText || !rawText.trim()) return [];

  const effectiveNeighborhoods = neighborhoods || neighborhood || '';
  const kwStr = Array.isArray(localKeywords) && localKeywords.length > 0 ? localKeywords.slice(0, 6).join(', ') : '';

  const prompt = `Atue como especialista em copywriting de produtos para o Google Meu Negócio da empresa "${businessName}".
Identifique e estruture a lista de produtos a seguir com descrições persuasivas entre 300 e 600 caracteres:

Cidade: ${city || 'Brasil'}
${effectiveNeighborhoods ? `Bairros: ${effectiveNeighborhoods}` : ''}
${kwStr ? `Palavras-chave: ${kwStr}` : ''}

LISTA DE PRODUTOS INFORMADA:
"""
${rawText}
"""

Responda ESTRITAMENTE em formato JSON:
{
  "products": [
    {
      "name": "Nome Comercial do Produto",
      "category": "Categoria Sugerida",
      "price": "Preço extraído ou estimado",
      "description": "Descrição com benefícios, indicação e CTA..."
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed.products) ? parsed.products : [];

    return list.map((p, idx) => ({
      id: `prod_${Date.now()}_${idx}`,
      name: p.name || `Produto ${idx + 1}`,
      category: p.category || 'Geral',
      price: p.price || 'Sob consulta',
      promo_price: '',
      description: p.description || '',
      photo_url: '',
      button_type: 'ORDER',
      button_url: '',
      is_active: true,
    }));
  } catch (err) {
    console.error('[Gemini Parse Bulk Products] Error:', err.message);
    const lines = rawText.split(/[\n,;]+/).map((l) => l.trim()).filter((l) => l.length > 2);
    return lines.map((name, idx) => ({
      id: `prod_${Date.now()}_${idx}`,
      name,
      category: 'Geral',
      price: 'Sob consulta',
      promo_price: '',
      description: `${name} disponível com procedência garantida na ${businessName || 'nossa loja'}. Solicite mais informações e valores pelo WhatsApp!`,
      photo_url: '',
      button_type: 'ORDER',
      button_url: '',
      is_active: true,
    }));
  }
}

/**
 * Extract products directly from a business website or digital catalog URL
 */
export async function extractProductsFromUrl({
  url,
  businessName,
  category,
  city = '',
}) {
  if (!url || !url.startsWith('http')) {
    throw new Error('URL inválida. Informe uma URL completa iniciando com http:// ou https://');
  }

  let textContent = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Servidor retornou status ${res.status}`);
    }

    const html = await res.text();
    textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16000);
  } catch (fetchErr) {
    console.warn('[Gemini Extract Products From URL] Fetch error:', fetchErr.message);
    throw new Error(`Não foi possível acessar a página (${fetchErr.message}). Tente copiar o texto da página e usar "Importar em Massa".`);
  }

  if (textContent.length < 30) {
    throw new Error('Não foi possível extrair texto legível desta página. Tente copiar e colar os produtos na opção "Importar em Massa".');
  }

  const prompt = `Você é um especialista em catálogo de produtos do Google Meu Negócio.
Analise o conteúdo extraído da página web da empresa "${businessName || 'Empresa'}" (categoria: ${category || 'Geral'}, cidade: ${city || 'Brasil'}):

CONTEÚDO DA PÁGINA:
"""
${textContent}
"""

Extraia até 15 produtos, pratos, serviços ou mercadorias encontradas na página com descrições persuasivas e preços.
Responda EXCLUSIVAMENTE em formato JSON rigoroso:
{
  "products": [
    {
      "name": "Nome curto do produto (máx 58 caracteres)",
      "category": "Categoria ou Seção",
      "price": "Preço em R$ se encontrado ou Sob Consulta",
      "promoPrice": "Preço promocional se houver",
      "description": "Descrição com benefícios, indicação e CTA (300 a 600 caracteres)"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed.products) ? parsed.products : [];

    return list.map((p, idx) => ({
      id: `prod_${Date.now()}_${idx}`,
      name: (p.name || `Produto ${idx + 1}`).trim().slice(0, 58),
      category: (p.category || 'Geral').trim(),
      price: (p.price || 'Sob consulta').trim(),
      promo_price: (p.promoPrice || '').trim(),
      description: (p.description || '').trim().slice(0, 1000),
      photo_url: '',
      button_type: 'ORDER',
      button_url: '',
      is_active: true,
    }));
  } catch (err) {
    console.error('[Gemini Extract URL Products] Parsing Error:', err.message);
    throw new Error('A IA não conseguiu identificar produtos estruturados nesta página. Experimente copiar o texto e usar "Importar em Massa".');
  }
}




