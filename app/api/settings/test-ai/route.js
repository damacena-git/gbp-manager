import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/test-ai
 * Tests the selected Gemini model and API key with a live ping
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    let { model, apiKey } = body;

    const targetModel = (model || 'gemini-flash-lite-latest').trim();

    // Resolve API key: provided in body, or saved in user_settings, or fallback to process.env.GEMINI_API_KEY
    let effectiveApiKey = apiKey && !apiKey.includes('••••') ? apiKey.trim() : null;

    if (!effectiveApiKey) {
      const settingsList = await sql(`
        SELECT gemini_api_key FROM public.user_settings WHERE user_id = ${escapeLiteral(user.id)} LIMIT 1;
      `);
      if (settingsList && settingsList[0]?.gemini_api_key) {
        effectiveApiKey = settingsList[0].gemini_api_key;
      }
    }

    if (!effectiveApiKey) {
      effectiveApiKey = process.env.GEMINI_API_KEY;
    }

    if (!effectiveApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma Chave de API do Gemini configurada. Insira sua chave ou configure a variável GEMINI_API_KEY.',
      }, { status: 400 });
    }

    const startTime = Date.now();
    const genAI = new GoogleGenerativeAI(effectiveApiKey);
    const aiModel = genAI.getGenerativeModel({ model: targetModel });

    const result = await aiModel.generateContent('Responda com exatamente uma palavra: Operacional.');
    const response = await result.response;
    const text = response.text().trim();
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      model: targetModel,
      latencyMs,
      message: text || 'Operacional',
    });
  } catch (error) {
    console.error('[Test AI Error]', error);

    let friendlyError = error.message || 'Erro ao conectar ao Gemini';
    let errorType = 'general';

    if (friendlyError.includes('429') || friendlyError.includes('RESOURCE_EXHAUSTED') || friendlyError.includes('quota') || friendlyError.includes('limit:')) {
      friendlyError = `Limite de cota excedido (429) no modelo "${model}". Recomendamos selecionar "Gemini Flash-Lite" ou "Gemini 3.5 Flash-Lite" que possuem cota ativa, ou inserir sua chave própria do Google AI Studio.`;
      errorType = 'quota_exceeded';
    } else if (friendlyError.includes('API_KEY_INVALID') || friendlyError.includes('API key not valid')) {
      friendlyError = 'Chave de API inválida. Verifique se copiou a chave corretamente do Google AI Studio.';
      errorType = 'invalid_key';
    } else if (friendlyError.includes('404') || friendlyError.includes('models/')) {
      friendlyError = `O modelo "${model}" não foi encontrado ou não está disponível para esta API key. Escolha um dos modelos recomendados.`;
      errorType = 'model_not_found';
    }

    return NextResponse.json({
      success: false,
      error: friendlyError,
      errorType,
      rawError: error.message,
    }, { status: 400 });
  }
}
