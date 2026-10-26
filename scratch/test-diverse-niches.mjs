import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

const testCases = [
  {
    service: 'Tratamento de Canal',
    category: 'Dentista / Odontologia',
    city: 'Campinas',
    neighborhoods: 'Cambuí, Taquaral e Centro',
  },
  {
    service: 'Harmonização Facial',
    category: 'Clínica de Estética',
    city: 'São Paulo',
    neighborhoods: 'Moema, Vila Mariana e Itaim Bibi',
  },
  {
    service: 'Alinhamento e Balanceamento 3D',
    category: 'Oficina Mecânica / Auto Center',
    city: 'Curitiba',
    neighborhoods: 'Batel, Água Verde e Portão',
  },
];

for (const tc of testCases) {
  const prompt = `Atue como especialista em SEO Local. Escreva uma descrição de serviço para o Google Meu Negócio.

Dados do Negócio:
- Serviço: ${tc.service}
- Nicho/Especialidade: ${tc.category}
- Cidade: ${tc.city}
- Bairros (Opcional): ${tc.neighborhoods}

Regras de Escrita:
1. Estrutura: Foque no benefício + diferencial técnico + chamada para ação curta.
2. SEO Semântico: Identifique e inclua 3 termos técnicos que especialistas da área usam para este serviço.
3. Contexto Local: Incorpore a cidade e os bairros de forma natural.
4. Tamanho: Máximo de até 280 a 290 caracteres (o limite técnico rigoroso da API do Google Meu Negócio para serviços é de 300 caracteres; certifique-se de que todo o texto termine antes de 295 caracteres para que a sincronização não seja rejeitada).
5. Sem aspas, sem títulos e sem explicações.

Responda APENAS com o texto da descrição pronta.`;

  const res = await model.generateContent(prompt);
  const text = res.response.text().trim().replace(/^["']|["']$/g, '');
  console.log(`\n=== [${tc.service} - ${tc.category}] === (${text.length} chars)`);
  console.log(text);
}
