import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export const SUPPORTED_GEMINI_MODELS = [
  // --- GRUPO 1: RECOMENDADOS E ALTA DISPONIBILIDADE (COTA ATIVA) ---
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini Flash-Lite (Mais Rápido / Cota Máxima)',
    badge: 'Recomendado',
    category: 'recommended',
    description: 'Sempre conectado à versão mais leve, ultra veloz e com maior limite de requisições gratuitas do Google. Ideal para o dia a dia.',
    speed: 'Ultra Rápido (~0.6s)',
    quota: 'Máxima (Sem Limite)',
    isHealthy: true,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    badge: 'Ultra Rápido',
    category: 'recommended',
    description: 'Arquitetura ultra leve da geração 3.5 com tempo de resposta sub-segundo e excelente taxa de cota.',
    speed: 'Ultra Rápido (~0.6s)',
    quota: 'Altíssima',
    isHealthy: true,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    badge: 'Equilibrado',
    category: 'recommended',
    description: 'Excelente equilíbrio entre raciocínio aprofundado, tom persuasivo e alta velocidade.',
    speed: 'Rápido (~2s)',
    quota: 'Alta',
    isHealthy: true,
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'Geração Moderna',
    category: 'recommended',
    description: 'Versão moderna da família Flash com excelente aderência a instruções de postagens e tom comercial.',
    speed: 'Rápido (~3s)',
    quota: 'Alta',
    isHealthy: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Preview)',
    badge: 'Nova Geração',
    category: 'recommended',
    description: 'Versão preliminar de nova geração com base atualizada e respostas completas.',
    speed: 'Rápido',
    quota: 'Alta',
    isHealthy: true,
  },

  // --- GRUPO 2: MODELOS AVANÇADOS / PRO (REQUER CHAVE PRÓPRIA OU COTA DIÁRIA) ---
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Geração 3.7',
    category: 'advanced',
    description: 'Raciocínio avançado. Atenção: no plano gratuito do Google há limite de 20 req/dia. Recomendado com chave própria do Google AI Studio.',
    speed: 'Rápido',
    quota: 'Limitada (Free 20/dia)',
    isHealthy: false,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Experimental)',
    badge: 'Experimental',
    category: 'advanced',
    description: 'Versão experimental mais recente da linha Flash. Sujeita a cotas diárias da Google.',
    speed: 'Rápido',
    quota: 'Limitada (Free Tier)',
    isHealthy: false,
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Clássico)',
    badge: 'Padrão Clássico',
    category: 'advanced',
    description: 'Alias padrão para o Gemini Flash clássico. Sujeito à cota periódica do Google AI Studio.',
    speed: 'Rápido',
    quota: 'Sujeita a Cota',
    isHealthy: false,
  },
  {
    id: 'gemini-pro-latest',
    name: 'Gemini Pro (Mais Recente)',
    badge: 'Profundo',
    category: 'advanced',
    description: 'Raciocínio aprofundado para diagnósticos minuciosos e auditorias analíticas complexas.',
    speed: 'Moderado',
    quota: 'Moderada',
    isHealthy: false,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    badge: 'Pro Analítico',
    category: 'advanced',
    description: 'Modelo Pro com alta profundidade cognitiva para diagnósticos de SEO e concorrência.',
    speed: 'Moderado',
    quota: 'Moderada',
    isHealthy: false,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Econômico',
    category: 'advanced',
    description: 'Modelo econômico da linha 3.1 para redação de posts e títulos.',
    speed: 'Moderado',
    quota: 'Sujeita a Demanda',
    isHealthy: false,
  },

  // --- GRUPO 3: MODELOS OPEN SOURCE GEMMA (GOOGLE DEEPMIND) ---
  {
    id: 'gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B Instruct',
    badge: 'Open Source',
    category: 'gemma',
    description: 'Modelo aberto do Google DeepMind otimizado para instruções e tarefas criativas de redação.',
    speed: 'Médio (~4s)',
    quota: 'Disponível',
    isHealthy: true,
  },
  {
    id: 'gemma-4-31b-it',
    name: 'Gemma 4 31B Instruct',
    badge: 'Open Source',
    category: 'gemma',
    description: 'Maior modelo da família Gemma com 31 bilhões de parâmetros para alta nuance textual.',
    speed: 'Médio',
    quota: 'Disponível',
    isHealthy: false,
  },
];

/**
 * GET /api/settings
 * Retrieves user configuration (AI model, key status, Google connection summary)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Fetch user settings
    const settingsList = await sql(`
      SELECT gemini_model, gemini_api_key, updated_at
      FROM public.user_settings
      WHERE user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const userSetting = settingsList && settingsList[0];
    const rawModel = userSetting?.gemini_model || 'gemini-flash-lite-latest';
    const rawApiKey = userSetting?.gemini_api_key || null;

    const hasCustomKey = Boolean(rawApiKey && rawApiKey.trim().length > 10);
    const maskedKey = hasCustomKey
      ? `${rawApiKey.slice(0, 8)}••••••••${rawApiKey.slice(-4)}`
      : null;

    // 2. Fetch Google integration status
    const clients = await sql(`
      SELECT id, business_name, google_account_id, google_location_id, status, last_sync_at,
             (refresh_token IS NOT NULL AND refresh_token != '') as has_token
      FROM public.clients
      WHERE user_id = ${escapeLiteral(user.id)} AND status = 'active'
      ORDER BY last_sync_at DESC NULLS LAST;
    `);

    const connectedClients = clients.filter((c) => c.has_token);
    const isGoogleConnected = connectedClients.length > 0;

    let lastSyncAt = null;
    if (connectedClients.length > 0 && connectedClients[0].last_sync_at) {
      lastSyncAt = connectedClients[0].last_sync_at;
    }

    return NextResponse.json({
      success: true,
      ai: {
        activeModel: rawModel,
        hasCustomKey,
        maskedKey,
        supportedModels: SUPPORTED_GEMINI_MODELS,
      },
      google: {
        isConnected: isGoogleConnected,
        connectedCount: connectedClients.length,
        lastSyncAt,
        locations: connectedClients.map((c) => ({
          id: c.id,
          name: c.business_name,
          locationId: c.google_location_id,
          lastSync: c.last_sync_at,
        })),
      },
    });
  } catch (error) {
    console.error('[Settings GET Error]', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar configurações' }, { status: 500 });
  }
}

/**
 * POST /api/settings
 * Saves AI model preference and optional custom API key
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { gemini_model, gemini_api_key, removeApiKey } = body;

    const selectedModel = (gemini_model || 'gemini-flash-lite-latest').trim();

    // Check if updating key or clearing key
    let keyUpdateClause = '';
    if (removeApiKey) {
      keyUpdateClause = `, gemini_api_key = NULL`;
    } else if (typeof gemini_api_key === 'string' && gemini_api_key.trim() && !gemini_api_key.includes('••••')) {
      const trimmedKey = gemini_api_key.trim();
      if (!trimmedKey.startsWith('AIza') || trimmedKey.length < 30) {
        return NextResponse.json({
          error: 'A chave de API informada é inválida. Uma chave do Google AI Studio deve começar com "AIzaSy..." e conter pelo menos 35 caracteres.',
        }, { status: 400 });
      }
      keyUpdateClause = `, gemini_api_key = ${escapeLiteral(trimmedKey)}`;
    }

    await sql(`
      INSERT INTO public.user_settings (user_id, gemini_model, updated_at)
      VALUES (${escapeLiteral(user.id)}, ${escapeLiteral(selectedModel)}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        gemini_model = ${escapeLiteral(selectedModel)},
        updated_at = now()
        ${keyUpdateClause};
    `);

    return NextResponse.json({
      success: true,
      message: 'Configurações de IA salvas com sucesso!',
      activeModel: selectedModel,
    });
  } catch (error) {
    console.error('[Settings POST Error]', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configurações' }, { status: 500 });
  }
}
