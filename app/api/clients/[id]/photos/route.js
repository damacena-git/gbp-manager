import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { fetchLocationPhotos } from '@/lib/google/gbp-service';

/**
 * Returns true if the client belongs to the given user
 */
async function userOwnsClient(clientId, userId) {
  const rows = await sql(`
    SELECT id FROM public.clients
    WHERE id = ${escapeLiteral(clientId)} AND user_id = ${escapeLiteral(userId)}
    LIMIT 1;
  `);
  return Boolean(rows?.[0]);
}

function notFound() {
  return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
}

/**
 * GET /api/clients/[id]/photos
 * List all photos for a client, auto-syncing from Google if empty or ?sync=true
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    if (!(await userOwnsClient(id, user.id))) return notFound();

    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('sync') === 'true';

    let photos = await sql(`
      SELECT * FROM public.photos
      WHERE client_id = ${escapeLiteral(id)}
      ORDER BY created_at DESC;
    `);

    // If local photos list is empty or forceSync requested, pull directly from Google API
    if ((!photos || photos.length === 0 || forceSync)) {
      const clientRows = await sql(`
        SELECT refresh_token, google_account_id, google_location_id
        FROM public.clients
        WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
        LIMIT 1;
      `);

      const client = clientRows?.[0];
      if (client?.refresh_token && client?.google_account_id && client?.google_location_id) {
        try {
          const mediaItems = await fetchLocationPhotos(
            client.refresh_token,
            client.google_account_id,
            client.google_location_id
          );

          if (mediaItems && mediaItems.length > 0) {
            for (const item of mediaItems) {
              if (!item.googleUrl) continue;
              const googlePhotoId = item.name;
              const category = item.locationAssociation?.category || 'ADDITIONAL';
              const createdTime = item.createTime || new Date().toISOString();

              const existing = await sql(`
                SELECT id FROM public.photos
                WHERE client_id = ${escapeLiteral(id)}
                  AND (google_photo_id = ${escapeLiteral(googlePhotoId)} OR url = ${escapeLiteral(item.googleUrl)})
                LIMIT 1;
              `);

              if (!existing || existing.length === 0) {
                await sql(`
                  INSERT INTO public.photos (
                    client_id, google_photo_id, url, thumbnail_url, category,
                    status, uploaded_at, created_at
                  ) VALUES (
                    ${escapeLiteral(id)},
                    ${escapeLiteral(googlePhotoId)},
                    ${escapeLiteral(item.googleUrl)},
                    ${escapeLiteral(item.thumbnailUrl || item.googleUrl)},
                    ${escapeLiteral(category)},
                    'uploaded',
                    ${escapeLiteral(createdTime)},
                    ${escapeLiteral(createdTime)}
                  );
                `);
              }
            }

            // Re-fetch updated list
            photos = await sql(`
              SELECT * FROM public.photos
              WHERE client_id = ${escapeLiteral(id)}
              ORDER BY created_at DESC;
            `);
          }
        } catch (syncErr) {
          console.warn('[API Photos GET] Could not auto-sync photos from Google:', syncErr.message);
        }
      }
    }

    return NextResponse.json({ photos: photos || [] });
  } catch (error) {
    console.error('[API Photos GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar fotos' }, { status: 500 });
  }
}


/**
 * POST /api/clients/[id]/photos
 * Add a new photo or bulk photos with geo-coordinates and SEO metadata
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    if (!(await userOwnsClient(id, user.id))) return notFound();

    const body = await request.json();
    const { photos: bulkPhotos, url, category = 'ADDITIONAL', alt_text = '', filename = '', geo_lat = null, geo_lng = null, metadata = {} } = body;

    // 1. Bulk photos upload
    if (Array.isArray(bulkPhotos) && bulkPhotos.length > 0) {
      const insertedList = [];
      for (const item of bulkPhotos) {
        if (!item.url) continue;
        const rows = await sql(`
          INSERT INTO public.photos (
            client_id, url, thumbnail_url, category, alt_text, filename, geo_lat, geo_lng, metadata, status, uploaded_at
          ) VALUES (
            ${escapeLiteral(id)},
            ${escapeLiteral(item.url)},
            ${escapeLiteral(item.thumbnail_url || item.url)},
            ${escapeLiteral(item.category || 'ADDITIONAL')},
            ${escapeLiteral(item.alt_text || '')},
            ${escapeLiteral(item.filename || '')},
            ${item.geo_lat != null ? Number(item.geo_lat) : 'NULL'},
            ${item.geo_lng != null ? Number(item.geo_lng) : 'NULL'},
            ${escapeLiteral(item.metadata || {})},
            'uploaded',
            now()
          )
          RETURNING *;
        `);
        if (rows && rows[0]) insertedList.push(rows[0]);
      }
      return NextResponse.json({ success: true, count: insertedList.length, photos: insertedList });
    }

    // 2. Single photo upload
    if (!url) {
      return NextResponse.json({ error: 'URL ou imagem é obrigatória' }, { status: 400 });
    }

    const inserted = await sql(`
      INSERT INTO public.photos (
        client_id, url, thumbnail_url, category, alt_text, filename, geo_lat, geo_lng, metadata, status, uploaded_at
      ) VALUES (
        ${escapeLiteral(id)},
        ${escapeLiteral(url)},
        ${escapeLiteral(url)},
        ${escapeLiteral(category)},
        ${escapeLiteral(alt_text)},
        ${escapeLiteral(filename)},
        ${geo_lat != null ? Number(geo_lat) : 'NULL'},
        ${geo_lng != null ? Number(geo_lng) : 'NULL'},
        ${escapeLiteral(metadata)},
        'uploaded',
        now()
      )
      RETURNING *;
    `);

    return NextResponse.json({ success: true, photo: inserted?.[0] });
  } catch (error) {
    console.error('[API Photos POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar foto' }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[id]/photos
 * Delete a photo
 */
export async function DELETE(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!(await userOwnsClient(id, user.id))) return notFound();

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ error: 'photoId é obrigatório' }, { status: 400 });
    }

    await sql(`
      DELETE FROM public.photos
      WHERE id = ${escapeLiteral(photoId)} AND client_id = ${escapeLiteral(id)};
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Photos DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao deletar foto' }, { status: 500 });
  }
}

/**
 * PUT /api/clients/[id]/photos
 * Update an existing photo (url, category, alt_text, filename, geo coordinates)
 */
export async function PUT(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    if (!(await userOwnsClient(id, user.id))) return notFound();

    const body = await request.json();
    const { photoId, url, category, alt_text, filename, geo_lat, geo_lng, metadata } = body;

    if (!photoId) {
      return NextResponse.json({ error: 'photoId é obrigatório' }, { status: 400 });
    }

    const updates = [];
    if (url !== undefined && url !== null) {
      updates.push(`url = ${escapeLiteral(url)}`);
      updates.push(`thumbnail_url = ${escapeLiteral(url)}`);
    }
    if (category !== undefined) updates.push(`category = ${escapeLiteral(category)}`);
    if (alt_text !== undefined) updates.push(`alt_text = ${escapeLiteral(alt_text)}`);
    if (filename !== undefined) updates.push(`filename = ${escapeLiteral(filename)}`);
    if (geo_lat !== undefined) updates.push(`geo_lat = ${geo_lat !== null ? Number(geo_lat) : 'NULL'}`);
    if (geo_lng !== undefined) updates.push(`geo_lng = ${geo_lng !== null ? Number(geo_lng) : 'NULL'}`);
    if (metadata !== undefined) updates.push(`metadata = ${escapeLiteral(metadata)}`);

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const updated = await sql(`
      UPDATE public.photos
      SET ${updates.join(', ')}
      WHERE id = ${escapeLiteral(photoId)} AND client_id = ${escapeLiteral(id)}
      RETURNING *;
    `);

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, photo: updated[0] });
  } catch (error) {
    console.error('[API Photos PUT] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar foto' }, { status: 500 });
  }
}

