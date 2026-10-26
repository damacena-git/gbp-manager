import { generatePost } from '../lib/ai/gemini-service.js';

async function testPosts() {
  console.log('Testing generatePost across multiple niches with new Local SEO prompt...\n');

  const testCases = [
    {
      businessInfo: {
        name: 'Podologia Dr. Pé Josiane Crozetta',
        category: 'Podologia Especializada',
        description: 'Clínica especializada em tratamentos podológicos, unhas encravadas, micoses, calosidades e órteses.',
        city: 'Brasília',
        neighborhoods: 'Sudoeste, Octogonal e Cruzeiro',
        localKeywords: ['podologia sudoeste', 'unha encravada brasilia']
      },
      topic: 'Calosidades profundas e calcanhar rachado',
      tone: 'profissional e acolhedor',
    },
    {
      businessInfo: {
        name: 'Clínica Odonto Arte',
        category: 'Odontologia e Implantes',
        description: 'Referência em implantes dentários, reabilitação oral e odontologia estética.',
        city: 'Curitiba',
        neighborhoods: 'Batel e Bigorrilho',
        localKeywords: ['implante dentario batel', 'dentista curitiba']
      },
      topic: 'Implante Dentário sem dor e com carga imediata',
      tone: 'persuasivo e confiante',
    }
  ];

  for (const tc of testCases) {
    try {
      console.log(`\n========================================`);
      console.log(`[TEST]: ${tc.businessInfo.name} - ${tc.topic}`);
      const res = await generatePost(tc.businessInfo, tc.topic, tc.tone);
      const content = res.content || '';
      console.log(`Tamanho: ${content.length} caracteres (Limite Google Posts: 1500)`);
      console.log('\nCONTEÚDO:\n' + content);
      console.log('\nCTA:', res.callToAction);
      console.log(`========================================\n`);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

testPosts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
