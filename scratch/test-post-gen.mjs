import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_FALLBACK_MODELS } from '../lib/ai/gemini-service.js';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testCascade() {
  console.log('Testing fallback cascade on prompt "Reflexologia podal"...');
  
  // Test 1: gemini-3.7-flash (which gives 429) falling back to working models
  const candidates = ['gemini-3.7-flash', ...DEFAULT_FALLBACK_MODELS];
  console.log('Candidates list:', candidates);
  
  let successText = null;
  for (const modelName of candidates) {
    try {
      console.log(`Trying model: ${modelName}...`);
      const m = genAI.getGenerativeModel({ model: modelName });
      const res = await m.generateContent('Crie um post comercial sobre Reflexologia Podal para o Google Meu Negócio.');
      successText = res.response.text();
      console.log(`✅ Success with model "${modelName}"!`);
      break;
    } catch (err) {
      console.log(`⚠️ Model "${modelName}" failed: ${err.message.slice(0, 100)}`);
    }
  }
  
  console.log('\nGenerated Content preview:');
  console.log(successText ? successText.slice(0, 200) + '...' : 'NONE');
}

testCascade().catch(console.error);
