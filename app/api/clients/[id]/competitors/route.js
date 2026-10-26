import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { generateCompetitorAnalysis } from '@/lib/ai/gemini-service';

/**
 * GET /api/clients/[id]/competitors
 * Real-time competitor benchmarking and strategy to outrank competitors on Google Maps
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true';

    // 1. Fetch client data
    const clientRows = await sql(`
      SELECT * FROM public.clients 
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clientRows && clientRows[0];
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    // 1.1 Return cached competitor analysis if it already exists and refresh is not requested (0 tokens consumed!)
    if (!refresh && client.competitor_analysis) {
      try {
        const saved = typeof client.competitor_analysis === 'string'
          ? JSON.parse(client.competitor_analysis)
          : client.competitor_analysis;

        let history = [];
        if (client.competitor_analysis_history) {
          history = typeof client.competitor_analysis_history === 'string'
            ? JSON.parse(client.competitor_analysis_history)
            : client.competitor_analysis_history;
        }

        return NextResponse.json({
          success: true,
          isSaved: true,
          hasSavedAnalysis: true,
          analyzed_at: saved.analyzed_at || client.updated_at,
          history,
          ...saved,
        });
      } catch (parseErr) {
        console.warn('[API Competitors] Could not parse saved analysis, generating fresh one:', parseErr.message);
      }
    }

    // 2. Fetch reviews statistics
    const reviewStats = await sql(`
      SELECT 
        COUNT(*)::int AS total,
        COALESCE(AVG(star_rating), 0) AS avg_stars
      FROM public.reviews 
      WHERE client_id = ${escapeLiteral(id)};
    `);
    const totalReviews = reviewStats?.[0]?.total || client.total_reviews || 0;
    const avgRating = Number(client.average_rating) || Number(reviewStats?.[0]?.avg_stars) || 0;

    // 3. Fetch photos count
    const photosCount = await sql(`
      SELECT COUNT(*)::int AS total 
      FROM public.photos 
      WHERE client_id = ${escapeLiteral(id)};
    `);
    const totalPhotos = photosCount?.[0]?.total || 0;

    // 4. Parse Address & City
    let addressStr = '';
    let cityStr = '';
    if (client.address) {
      if (typeof client.address === 'string') {
        try {
          const parsed = JSON.parse(client.address);
          addressStr = parsed.addressLines?.join(', ') || parsed.locality || client.address;
          cityStr = parsed.locality || '';
        } catch {
          addressStr = client.address;
        }
      } else if (typeof client.address === 'object') {
        addressStr = client.address.addressLines?.join(', ') || client.address.locality || '';
        cityStr = client.address.locality || '';
      }
    }

    // Parse secondary categories
    let secCats = [];
    if (Array.isArray(client.secondary_categories)) {
      secCats = client.secondary_categories;
    } else if (typeof client.secondary_categories === 'string') {
      try {
        secCats = JSON.parse(client.secondary_categories || '[]');
      } catch {
        secCats = [];
      }
    }

    // 5. Generate Competitor Benchmark & Outranking Plan via Gemini
    const analysis = await generateCompetitorAnalysis({
      businessName: client.business_name,
      category: client.category,
      secondaryCategories: secCats,
      city: cityStr || addressStr || 'Brasil',
      averageRating: avgRating,
      totalReviews,
      totalPhotos,
      hasWebsite: Boolean(client.website),
      description: client.description || '',
    });

    const nowIso = new Date().toISOString();

    // 6. Manage History: archive previous analysis if it existed
    let history = [];
    if (client.competitor_analysis_history) {
      try {
        history = typeof client.competitor_analysis_history === 'string'
          ? JSON.parse(client.competitor_analysis_history)
          : client.competitor_analysis_history;
      } catch {
        history = [];
      }
    }

    if (client.competitor_analysis) {
      try {
        const prev = typeof client.competitor_analysis === 'string'
          ? JSON.parse(client.competitor_analysis)
          : client.competitor_analysis;
        history.push({
          benchmarkSummary: prev.benchmarkSummary,
          analyzed_at: prev.analyzed_at || nowIso,
        });
      } catch (histErr) {
        console.warn('[API Competitors] Error archiving previous analysis:', histErr.message);
      }
    }

    const payload = {
      client: {
        id: client.id,
        business_name: client.business_name,
        category: client.category,
        secondary_categories: secCats,
        average_rating: avgRating,
        total_reviews: totalReviews,
        total_photos: totalPhotos,
        city: cityStr,
      },
      benchmarkSummary: analysis.benchmarkSummary,
      competitors: analysis.competitors,
      strategyToOutrank: analysis.strategyToOutrank,
      analyzed_at: nowIso,
    };

    // 7. Persist to database
    try {
      await sql(`
        UPDATE public.clients SET
          competitor_analysis = ${escapeLiteral(JSON.stringify(payload))}::jsonb,
          competitor_analysis_history = ${escapeLiteral(JSON.stringify(history))}::jsonb,
          updated_at = now()
        WHERE id = ${escapeLiteral(id)};
      `);
    } catch (saveErr) {
      console.error('[API Competitors Save Error]:', saveErr.message);
    }

    return NextResponse.json({
      success: true,
      isSaved: true,
      hasSavedAnalysis: true,
      history,
      ...payload,
    });
  } catch (error) {
    console.error('[API Competitors GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao analisar concorrentes' }, { status: 500 });
  }
}
