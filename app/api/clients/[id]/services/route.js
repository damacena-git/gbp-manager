import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { fetchLocationServices, updateLocationServices } from '@/lib/google/gbp-service';

/**
 * GET /api/clients/[id]/services
 * List all services for a specific client.
 * Auto-syncs from Google if local list is empty or if ?sync=true
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('sync') === 'true';

    const rows = await sql(`
      SELECT services, business_name, category, refresh_token, google_location_id
      FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const client = rows[0];
    let services = Array.isArray(client.services)
      ? client.services
      : (typeof client.services === 'string' ? JSON.parse(client.services || '[]') : []);

    // If local services are empty or sync requested, fetch directly from Google API
    if ((services.length === 0 || forceSync) && client.refresh_token && client.google_location_id) {
      try {
        const { services: googleServices } = await fetchLocationServices(
          client.refresh_token,
          client.google_location_id
        );

        if (googleServices && googleServices.length > 0) {
          const existingMap = new Map();
          for (const s of services) {
            if (s.name) existingMap.set(s.name.toLowerCase().trim(), s);
            if (s.service_type_id) existingMap.set(s.service_type_id, s);
          }

          services = googleServices.map((gs) => {
            const match = existingMap.get(gs.name?.toLowerCase().trim()) || (gs.service_type_id ? existingMap.get(gs.service_type_id) : null);
            if (match) {
              return {
                ...gs,
                description: match.description || gs.description,
                price: match.price || gs.price,
                category: match.category || gs.category,
              };
            }
            return gs;
          });

          await sql(`
            UPDATE public.clients
            SET services = ${escapeLiteral(JSON.stringify(services))}::jsonb,
                updated_at = now()
            WHERE id = ${escapeLiteral(id)};
          `);
          console.log(`[API Services GET] Auto-synced ${services.length} services from Google`);
        }
      } catch (syncErr) {
        console.warn('[API Services GET] Could not auto-sync from Google:', syncErr.message);
      }
    }

    return NextResponse.json({
      services,
      business_name: client.business_name,
      category: client.category,
    });
  } catch (error) {
    console.error('[API Services GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar serviços' }, { status: 500 });
  }
}

/**
 * PUT /api/clients/[id]/services
 * Update full services list for a client and pushes changes to Google My Business
 */
export async function PUT(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const body = await request.json();
    const { services, syncGoogle = true } = body;

    if (!Array.isArray(services)) {
      return NextResponse.json({ error: 'A lista de serviços deve ser um array' }, { status: 400 });
    }

    const updated = await sql(`
      UPDATE public.clients
      SET services = ${escapeLiteral(JSON.stringify(services))}::jsonb,
          updated_at = now()
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      RETURNING services, refresh_token, google_location_id;
    `);

    const client = updated?.[0];
    let googleSyncResult = { synced: false };

    // Push to Google Business Profile if connected
    if (syncGoogle && client?.refresh_token && client?.google_location_id) {
      try {
        const patchResult = await updateLocationServices(
          client.refresh_token,
          client.google_location_id,
          services
        );
        googleSyncResult = { synced: patchResult.success, error: patchResult.error || null };
        console.log('[API Services PUT] Pushed services to Google result:', patchResult);
      } catch (gErr) {
        console.warn('[API Services PUT] Error pushing to Google:', gErr.message);
        googleSyncResult = { synced: false, error: gErr.message };
      }
    }

    return NextResponse.json({
      success: true,
      googleUpdated: !!googleSyncResult.synced,
      googleSync: googleSyncResult,
      services: client?.services || services,
    });
  } catch (error) {
    console.error('[API Services PUT] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar serviços' }, { status: 500 });
  }
}

