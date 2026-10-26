import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

const services = [
  'Tratamento de Unha Encravada',
  'Calos e Calosidades',
  'Órtese Ungueal',
  'Laserterapia Podológica',
  'Atendimento Pé Diabético'
];

const city = 'Brasília';
const neighborhoods = 'Sudoeste, Octogonal e Cruzeiro';
const category = 'Podologia';

for (const serviceName of services) {
  const prompt = `Atue como especialista em SEO Local. Escreva uma descrição de serviço para o Google Meu Negócio.

Dados do Negócio:
- Serviço: ${serviceName}
- Especialidade: ${category}
- Cidade: ${city}
- Bairros (Opcional): ${neighborhoods}

Regras de Escrita:
1. Estrutura: Foque no benefício + diferencial técnico + chamada para ação curta.
2. SEO Semântico: Identifique e inclua 3 termos técnicos que especialistas da área usam para este serviço.
3. Contexto Local: Incorpore a cidade e os bairros de forma natural.
4. Tamanho: Máximo de até 290 caracteres (limite técnico rigoroso do Google Meu Negócio para serviços é de 300 caracteres, garanta que todo o texto termine antes de 295 caracteres).
5. Sem aspas e sem explicações.

Responda APENAS com o texto da descrição pronta.`;

  const res = await model.generateContent(prompt);
  const text = res.response.text().trim().replace(/^["']|["']$/g, '');
  console.log(`\n=== [${serviceName}] === (${text.length} chars)`);
  console.log(text);
}
