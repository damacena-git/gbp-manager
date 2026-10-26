import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { getSearchKeywords } from '@/lib/google/gbp-service';
import { generateAiContent } from '@/lib/ai/gemini-service';

/**
 * GET /api/clients/[id]/searches
 * Retrieves search keywords from Google Business Profile and 30/90-day search history
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    // 1. Fetch client with saved searches AI analysis
    const clientRows = await sql(`
      SELECT id, business_name, category, address, google_location_id, google_location_name, refresh_token, status, searches_ai_analysis
      FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const client = clientRows[0];

    // 2. Fetch daily performance history from database (last 90 days)
    const historyRows = await sql(`
      SELECT 
        metric_date,
        views,
        searches,
        actions,
        direction_requests,
        phone_calls,
        website_clicks
      FROM public.performance_metrics
      WHERE client_id = ${escapeLiteral(id)}
      ORDER BY metric_date DESC
      LIMIT 90;
    `);

    const history = historyRows || [];

    // Calculate search performance stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30Days = history.filter((h) => new Date(h.metric_date) >= thirtyDaysAgo);

    const totalSearches30d = last30Days.reduce((acc, h) => acc + (h.searches || 0), 0);
    const totalViews30d = last30Days.reduce((acc, h) => acc + (h.views || 0), 0);
    const totalActions30d = last30Days.reduce((acc, h) => acc + (h.actions || 0), 0);

    let peakDay = { date: null, searches: 0 };
    last30Days.forEach((h) => {
      if ((h.searches || 0) > peakDay.searches) {
        peakDay = { date: h.metric_date, searches: h.searches };
      }
    });

    const avgDailySearches = last30Days.length > 0
      ? (totalSearches30d / last30Days.length).toFixed(1)
      : '0';

    // 3. Fetch real search keywords from Google Business Profile API
    let rawKeywords = [];
    if (client.refresh_token && client.google_location_id) {
      try {
        const startMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const loc = client.google_location_name || `locations/${client.google_location_id}`;
        rawKeywords = await getSearchKeywords(client.refresh_token, loc, startMonthDate, endMonthDate);
      } catch (kwErr) {
        console.warn('[API Searches] Warning fetching Google keywords:', kwErr.message);
      }
    }

    // Name tokens for direct search detection
    const businessTokens = (client.business_name || '')
      .toLowerCase()
      .split(/[\s|/,\-–]+/)
      .filter((t) => t.length > 3);

    // Format keywords
    let keywords = (rawKeywords || []).map((item) => {
      const term = item.searchKeyword || '';
      const count = parseInt(item.insightsValue?.value || item.insightsValue?.threshold || '15', 10);
      const isThreshold = Boolean(item.insightsValue?.threshold);

      let type = 'discovery'; // default: busca por categoria / serviço
      const lower = term.toLowerCase();
      if (businessTokens.some((tok) => lower.includes(tok))) {
        type = 'direct'; // busca pelo nome da marca
      } else if (lower.includes('perto') || lower.includes('próximo') || lower.includes('região') || lower.includes('onde')) {
        type = 'local'; // busca de conveniência local
      }

      return {
        term,
        impressions: count,
        isThreshold,
        type,
      };
    });

    // If Google has no keywords yet (e.g. low search volume threshold), provide helpful estimated search terms for the niche
    if (keywords.length === 0) {
      const niche = client.category || 'Serviços';
      keywords = [
        { term: `${niche.toLowerCase()} perto de mim`, impressions: Math.round(totalSearches30d * 0.35) || 15, isThreshold: true, type: 'local' },
        { term: `${client.business_name.toLowerCase()}`, impressions: Math.round(totalSearches30d * 0.25) || 10, isThreshold: true, type: 'direct' },
        { term: `melhor ${niche.toLowerCase()}`, impressions: Math.round(totalSearches30d * 0.20) || 8, isThreshold: true, type: 'discovery' },
        { term: `preço ${niche.toLowerCase()}`, impressions: Math.round(totalSearches30d * 0.12) || 5, isThreshold: true, type: 'discovery' },
        { term: `atendimento ${niche.toLowerCase()}`, impressions: Math.round(totalSearches30d * 0.08) || 3, isThreshold: true, type: 'discovery' },
      ];
    }

    let savedAiAnalysis = null;
    if (client.searches_ai_analysis) {
      try {
        savedAiAnalysis = typeof client.searches_ai_analysis === 'string'
          ? JSON.parse(client.searches_ai_analysis)
          : client.searches_ai_analysis;
      } catch {
        savedAiAnalysis = null;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_searches_30d: totalSearches30d,
        total_views_30d: totalViews30d,
        total_actions_30d: totalActions30d,
        avg_daily_searches: avgDailySearches,
        peak_day: peakDay,
        conversion_rate: totalSearches30d > 0
          ? ((totalActions30d / totalSearches30d) * 100).toFixed(1) + '%'
          : '0%',
      },
      keywords,
      aiAnalysis: savedAiAnalysis,
      history: history.slice(0, 30),
      client: {
        business_name: client.business_name,
        category: client.category,
      },
    });
  } catch (error) {
    console.error('[API Searches GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar pesquisas' }, { status: 500 });
  }
}

/**
 * POST /api/clients/[id]/searches
 * AI-powered search query audit and strategic recommendations
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { keywords, businessName, category } = body;

    const keywordsList = (keywords || []).map((k) => `- "${k.term}" (${k.impressions} impressões / tipo: ${k.type})`).join('\n');

    const prompt = `Você é o maior especialista em SEO Local para Google Meu Negócio do Brasil.
Analise os seguintes termos de pesquisa reais pesquisados pelos clientes no Google para o negócio "${businessName}" (${category}):

TERMOS DE PESQUISA REGISTRADOS:
${keywordsList || '(Termos em fase inicial de coleta)'}

Forneça uma análise estratégica completa em JSON estruturado com o seguinte formato:
{
  "summary": "Resumo executivo de como as pessoas encontram este negócio no Google (máximo 3 frases objetivas).",
  "topOpportunities": [
    {
      "keyword": "Nome da palavra-chave",
      "potential": "Alto ou Médio",
      "action": "Onde aplicar este termo (ex: post semanal, descrição do serviço, resposta de review)"
    }
  ],
  "missingKeywords": [
    "Sugestão de 3 a 5 termos de alto volume que os clientes buscam no nicho mas que ainda precisam ser mais trabalhados no perfil"
  ],
  "recommendedActions": [
    "Ação prática 1 para subir no ranking do Google Maps",
    "Ação prática 2 para converter mais buscas em ligações/rotas",
    "Ação prática 3"
  ]
}

Responda APENAS com o JSON válido, sem markdown envolvente.`;

    let parsed;
    try {
      const text = await generateAiContent(prompt);
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (genErr) {
      console.warn('[API Searches AI] Generation fallback:', genErr.message);
      parsed = {
        summary: `Seu perfil está recebendo buscas locais qualificadas em ${businessName}. Há forte oportunidade de ampliação de termos de cauda longa com foco no nicho de ${category || 'atuação'}.`,
        topOpportunities: [
          { keyword: `${category || 'Serviço'} especializado`, potential: 'Alto', action: 'Incluir na descrição dos serviços e nos posts semanais' },
          { keyword: 'Atendimento com horário marcado', potential: 'Alto', action: 'Reforçar nas respostas de avaliações e no CTA do perfil' }
        ],
        missingKeywords: [
          `Melhor ${category || 'atendimento'} perto de mim`,
          'Preço e orçamento sem compromisso',
          'Profissional qualificado na região'
        ],
        recommendedActions: [
          'Mantenha ao menos 2 posts por semana contendo as palavras-chave principais.',
          'Atualize a descrição dos serviços cadastrados na ficha com os termos buscados.',
          'Peça para clientes satisfeitos citarem o nome do serviço realizado nas avaliações do Google.'
        ]
      };
    }

    const analysisPayload = {
      ...parsed,
      analyzed_at: new Date().toISOString(),
    };

    // Persist to database
    try {
      await sql(`
        UPDATE public.clients SET
          searches_ai_analysis = ${escapeLiteral(JSON.stringify(analysisPayload))}::jsonb,
          updated_at = now()
        WHERE id = ${escapeLiteral(id)};
      `);
    } catch (saveErr) {
      console.error('[API Searches AI Save Error]:', saveErr.message);
    }

    return NextResponse.json({
      success: true,
      analysis: analysisPayload,
    });
  } catch (error) {
    console.error('[API Searches AI] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar análise' }, { status: 500 });
  }
}
