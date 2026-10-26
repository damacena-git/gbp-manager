import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

const businessInfo = {
  name: 'Podologia Dr. Lincoln & Equipe',
  category: 'Podologia Clínica e Estética dos Pés',
  description: 'Clínica de podologia especializada em tratamentos avançados dos pés, unhas encravadas, calosidades e pés diabéticos com mais de 10 anos de experiência.',
  city: 'Brasília',
  neighborhoods: 'Sudoeste, Octogonal e Cruzeiro',
  localKeywords: ['podologia sudoeste', 'tratamento de calosidades brasilia', 'unha encravada octogonal']
};

const topic = 'Remoção correta de calosidades e calcanhares ásperos';
const tone = 'profissional e acolhedor';
const type = 'STANDARD';

const prompt = `Atue como especialista em SEO Local e copywriting de alta conversão. Escreva uma postagem completa, aprofundada e persuasiva para o Google Meu Negócio (Google Business Profile - Atualizações/Novidades).

Dados do Negócio:
- Tópico / Serviço Abordado: ${topic}
- Nicho / Especialidade: ${businessInfo.category}
- Empresa: ${businessInfo.name}
- Cidade: ${businessInfo.city}
- Bairros de Atuação: ${businessInfo.neighborhoods}
- Perfil da Empresa: "${businessInfo.description}"
- Termos de busca locais no Google Maps: ${businessInfo.localKeywords.join(', ')}
- Tipo de Postagem: ${type}
- Tom de Voz: ${tone}

Regras de Escrita (PROIBIDO TEXTO SUPERFICIAL OU CURTO DEMAIS):
1. Tamanho: Máximo de 1400 caracteres (o limite da plataforma é de 1500 caracteres). Desenvolva um post aprofundado, educativo, envolvente e persuasivo (idealmente entre 600 e 1200 caracteres), com parágrafos bem espaçados. NUNCA faça um resuminho superficial de poucas linhas.
2. SEO Semântico: Identifique e inclua obrigatoriamente 3 termos técnicos que especialistas da área usam para este assunto/serviço (ex: desbastamento laminar, hiperqueratose, enucleação, hidratação oclusiva). Explique esses termos com clareza para educar o leitor e demonstrar autoridade.
3. Contexto Local: Incorpore a cidade e os bairros de atuação de forma fluida e natural ao longo do texto para ranquear com força nas buscas locais do Google Maps.
4. Estrutura Persuasiva:
   - Gancho forte: abra com uma pergunta instigante ou afirmação impactante focada no incômodo, dor ou vergonha do cliente.
   - Desenvolvimento & Diferencial Técnico: explique o que acontece, por que lixar o pé ou usar lâminas em casa piora a situação gerando efeito rebote, e como o procedimento especializado é feito com segurança, biossegurança e instrumentos esterilizados.
   - Solução & Benefício: mostre o alívio imediato, o conforto na pisada e a recuperação da pele macia e saudável.
   - Chamada para Ação (CTA) clara: convite para agendar uma avaliação no WhatsApp ou garantir um horário.
5. Formatação: Use quebras de linha entre os parágrafos para leitura confortável no celular e emojis com moderação profissional.
6. Proibido clichês genéricos (como "ambiente acolhedor", "equipe qualificada", "atendimento de excelência") sem respaldo prático.
7. NÃO use hashtags (o Google Meu Negócio não utiliza hashtags).

Responda ESTRITAMENTE em formato JSON:
{
  "content": "Texto completo, aprofundado e persuasivo do post aqui com quebras de linha...",
  "callToAction": {
    "type": "BOOK",
    "label": "Agendar Agora"
  }
}`;

async function run() {
  console.log('Generating test post with enhanced prompt...\n');
  const res = await model.generateContent(prompt);
  const text = res.response.text();
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  console.log(`Character count: ${parsed.content.length}/1500`);
  console.log('\n--- CONTENT ---');
  console.log(parsed.content);
  console.log('\n--- CTA ---');
  console.log(parsed.callToAction);
}

run().catch(console.error);
