import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { updateGoogleLocationFull } from '@/lib/google/gbp-service';

/**
 * GET /api/clients - List all clients for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const clients = await sql(`
      SELECT 
        c.*,
        COALESCE(pm_agg.views_30d, 0)::int as views_30d,
        COALESCE(pm_agg.searches_30d, 0)::int as searches_30d,
        COALESCE(pm_agg.actions_30d, 0)::int as actions_30d,
        COALESCE(post_agg.posts_count, 0)::int as posts_count,
        COALESCE(rev_agg.reviews_count, c.total_reviews, 0)::int as reviews_count
      FROM public.clients c
      LEFT JOIN (
        SELECT 
          client_id,
          SUM(views) as views_30d,
          SUM(searches) as searches_30d,
          SUM(actions) as actions_30d
        FROM public.performance_metrics
        WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY client_id
      ) pm_agg ON pm_agg.client_id = c.id
      LEFT JOIN (
        SELECT client_id, COUNT(*) as posts_count
        FROM public.scheduled_posts
        GROUP BY client_id
      ) post_agg ON post_agg.client_id = c.id
      LEFT JOIN (
        SELECT client_id, COUNT(*) as reviews_count
        FROM public.reviews
        GROUP BY client_id
      ) rev_agg ON rev_agg.client_id = c.id
      WHERE c.user_id = ${escapeLiteral(user.id)}
      ORDER BY c.created_at DESC;
    `);

    return NextResponse.json({ clients: clients || [] });
  } catch (error) {
    console.error('[API Clients] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST /api/clients - Create a new client manually
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();

    const result = await sql(`
      INSERT INTO public.clients (
        user_id, business_name, category, phone, address, description, website, status
      ) VALUES (
        ${escapeLiteral(user.id)},
        ${escapeLiteral(body.business_name)},
        ${escapeLiteral(body.category)},
        ${escapeLiteral(body.phone)},
        ${escapeLiteral(body.address || {})},
        ${escapeLiteral(body.description)},
        ${escapeLiteral(body.website)},
        'disconnected'
      ) RETURNING *;
    `);

    return NextResponse.json({ client: result && result[0] }, { status: 201 });
  } catch (error) {
    console.error('[API Clients] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PUT /api/clients - Update a client
 */
export async function PUT(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, sync_google, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    }

    // 1. Fetch current client
    const clientRows = await sql(`
      SELECT * FROM public.clients 
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);
    const client = clientRows && clientRows[0];
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // 2. Google My Business API update if requested and tokens present
    let googleResult = null;
    if (sync_google && client.refresh_token && client.google_location_id) {
      try {
        googleResult = await updateGoogleLocationFull(
          client.refresh_token,
          client.google_location_id,
          updateData
        );
      } catch (gErr) {
        console.warn('[Google Update Exception]:', gErr.message);
        googleResult = { success: false, error: gErr.message };
      }
    }

    // 3. Update database
    const setClauses = [];
    for (const [key, value] of Object.entries(updateData)) {
      if (typeof value === 'object' && value !== null) {
        setClauses.push(`${key} = ${escapeLiteral(JSON.stringify(value))}::jsonb`);
      } else {
        setClauses.push(`${key} = ${escapeLiteral(value)}`);
      }
    }

    let updatedClient = client;
    if (setClauses.length > 0) {
      const result = await sql(`
        UPDATE public.clients
        SET ${setClauses.join(', ')}, updated_at = now()
        WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
        RETURNING *;
      `);
      updatedClient = result && result[0];
    }

    return NextResponse.json({
      client: updatedClient,
      googleUpdated: googleResult?.success ?? false,
      googleWarning: googleResult?.error || null,
    });
  } catch (error) {
    console.error('[API Clients] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/clients - Delete a client
 */
export async function DELETE(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    }

    await sql(`
      DELETE FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)};
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Clients] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
