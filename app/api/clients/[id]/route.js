import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';

/**
 * GET /api/clients/[id]
 * Fast single-client fetch with 30-day performance summary
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const clientRows = await sql(`
      SELECT 
        c.*,
        COALESCE(pm_agg.views_30d, 0)::int as views_30d,
        COALESCE(pm_agg.searches_30d, 0)::int as searches_30d,
        COALESCE(pm_agg.actions_30d, 0)::int as actions_30d
      FROM public.clients c
      LEFT JOIN (
        SELECT 
          client_id,
          SUM(views) as views_30d,
          SUM(searches) as searches_30d,
          SUM(actions) as actions_30d
        FROM public.performance_metrics
        WHERE client_id = ${escapeLiteral(id)}
          AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY client_id
      ) pm_agg ON pm_agg.client_id = c.id
      WHERE c.id = ${escapeLiteral(id)} AND c.user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ client: clientRows[0] });
  } catch (error) {
    console.error('[API Clients GET by ID] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
