import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';

/**
 * GET /api/posts - List posts (optionally filtered by client_id)
 */
export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    let whereClauses = [`c.user_id = ${escapeLiteral(user.id)}`];
    if (clientId) whereClauses.push(`p.client_id = ${escapeLiteral(clientId)}`);
    if (status) whereClauses.push(`p.status = ${escapeLiteral(status)}`);

    const whereStr = `WHERE ${whereClauses.join(' AND ')}`;

    // Trigger background processing of any due posts
    const { processScheduledPosts } = await import('@/lib/scheduler/cron-service');
    processScheduledPosts().catch((err) => console.warn('[Posts GET Auto-Process]:', err.message));

    const posts = await sql(`
      SELECT p.*,
        json_build_object('id', c.id, 'business_name', c.business_name, 'category', c.category) as clients
      FROM public.scheduled_posts p
      JOIN public.clients c ON c.id = p.client_id
      ${whereStr}
      ORDER BY p.created_at DESC;
    `);

    return NextResponse.json({ posts: posts || [] });
  } catch (error) {
    console.error('[API Posts] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

import { createPost, updatePost, uploadPhoto } from '@/lib/google/gbp-service';
import { sanitizeMediaUrls } from '@/lib/supabase/storage';

function formatMediaUrls(urls) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) return "'{}'::text[]";
  const escaped = urls.filter(Boolean).map((u) => escapeLiteral(String(u)));
  if (escaped.length === 0) return "'{}'::text[]";
  return `ARRAY[${escaped.join(', ')}]::text[]`;
}

/**
 * POST /api/posts - Create single or bulk posts, with optional immediate Google publishing
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();

    // 1. Action: Publish existing post immediately to Google
    if (body.action === 'publish_now' && body.post_id) {
      const posts = await sql(`
        SELECT p.*, c.google_account_id, c.google_location_id, c.refresh_token
        FROM public.scheduled_posts p
        JOIN public.clients c ON c.id = p.client_id
        WHERE p.id = ${escapeLiteral(body.post_id)} AND c.user_id = ${escapeLiteral(user.id)}
        LIMIT 1;
      `);

      const post = posts?.[0];
      if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
      if (!post.refresh_token || !post.google_location_id) {
        return NextResponse.json({ error: 'Cliente não conectado ao Google Meu Negócio' }, { status: 400 });
      }

      const locationName = `accounts/${post.google_account_id}/locations/${post.google_location_id}`;
      const allUrls = post.media_urls || [];
      const primaryMedia = allUrls.length > 0 ? [{ url: allUrls[0], format: 'PHOTO' }] : [];
      const googleResult = await createPost(post.refresh_token, locationName, {
        content: post.content,
        topicType: post.topic_type || 'STANDARD',
        callToAction: post.call_to_action,
        mediaItems: primaryMedia,
        eventSchedule: post.event_data,
        offerData: post.offer_data,
      });



      const updated = await sql(`
        UPDATE public.scheduled_posts
        SET status = 'published',
            published_at = now(),
            google_post_id = ${escapeLiteral(googleResult.name)},
            updated_at = now()
        WHERE id = ${escapeLiteral(post.id)}
        RETURNING *;
      `);

      return NextResponse.json({ success: true, post: updated?.[0] });
    }

    // 2. Creation: Single or Bulk Posts
    const clientId = body.client_id;
    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Verify client belongs to user
    const clients = await sql(`
      SELECT * FROM public.clients
      WHERE id = ${escapeLiteral(clientId)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clients?.[0];
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Extract posts list (either single or bulk)
    const rawList = Array.isArray(body.posts) && body.posts.length > 0 ? body.posts : [body];
    const insertedList = [];
    let publishedCount = 0;
    let scheduledCount = 0;

    const locationName = client.refresh_token && client.google_account_id && client.google_location_id
      ? `accounts/${client.google_account_id}/locations/${client.google_location_id}`
      : null;

    for (const item of rawList) {
      if (!item.content || typeof item.content !== 'string' || !item.content.trim()) continue;

      const isImmediate = Boolean(item.publish_now || item.publish_immediately);
      let postStatus = isImmediate ? 'published' : (item.scheduled_for ? 'scheduled' : 'draft');
      let googlePostId = null;
      let publishedAt = null;

      // Extract and sanitize media items (supports both photos and videos, guarantees public HTTPS URLs)
      const rawMediaUrls = item.media_urls || (item.media_items ? item.media_items.map((m) => m.url) : []);
      const sanitizedUrls = await sanitizeMediaUrls(rawMediaUrls, 'posts');
      const mediaItems = item.media_items && Array.isArray(item.media_items) && item.media_items.length > 0
        ? await sanitizeMediaUrls(item.media_items, 'posts')
        : sanitizedUrls.map((url) => ({
            url,
            format: url && url.match(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i) ? 'VIDEO' : 'PHOTO',
          }));

      // If publish immediately requested and client is connected to Google, trigger createPost API now!
      if (isImmediate && locationName) {
        try {
          const primaryMedia = mediaItems.slice(0, 1);
          const gRes = await createPost(client.refresh_token, locationName, {
            content: item.content,
            topicType: item.topic_type || 'STANDARD',
            callToAction: item.call_to_action || null,
            mediaItems: primaryMedia,
            eventSchedule: item.event_data,
            offerData: item.offer_data,
          });
          googlePostId = gRes.name;
          publishedAt = new Date().toISOString();
          postStatus = 'published';
          publishedCount++;


        } catch (gErr) {
          console.warn('[API Posts] Immediate publish to Google failed, saving as draft/scheduled:', gErr.message);
          postStatus = item.scheduled_for ? 'scheduled' : 'draft';
        }
      }

      if (postStatus === 'scheduled') {
        scheduledCount++;
      }

      const mediaUrlsSql = formatMediaUrls(sanitizedUrls);

      const rows = await sql(`
        INSERT INTO public.scheduled_posts (
          client_id, content, media_urls, topic_type, call_to_action,
          event_data, offer_data, scheduled_for, published_at, google_post_id,
          status, ai_generated, ai_prompt, created_at, updated_at
        ) VALUES (
          ${escapeLiteral(clientId)},
          ${escapeLiteral(item.content.trim())},
          ${mediaUrlsSql},
          ${escapeLiteral(item.topic_type || 'STANDARD')},
          ${escapeLiteral(item.call_to_action || null)},
          ${escapeLiteral(item.event_data || null)},
          ${escapeLiteral(item.offer_data || null)},
          ${escapeLiteral(item.scheduled_for || null)},
          ${escapeLiteral(publishedAt)},
          ${escapeLiteral(googlePostId)},
          ${escapeLiteral(postStatus)},
          ${item.ai_generated ? 'true' : 'false'},
          ${escapeLiteral(item.ai_prompt || null)},
          now(),
          now()
        )
        RETURNING *;
      `);

      if (rows && rows[0]) {
        insertedList.push(rows[0]);
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedList.length,
      publishedCount,
      scheduledCount,
      posts: insertedList,
      post: insertedList[0] || null,
    }, { status: 201 });
  } catch (error) {
    console.error('[API Posts] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}


/**
 * PUT /api/posts - Update a post
 */
export async function PUT(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: 'ID do post é obrigatório' }, { status: 400 });

    // Check existing post
    const existingRows = await sql(`
      SELECT p.*, c.refresh_token, c.google_account_id, c.google_location_id, c.business_name
      FROM public.scheduled_posts p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = ${escapeLiteral(id)} AND c.user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const existingPost = existingRows?.[0];
    if (!existingPost) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });

    const isAlreadyPublished = Boolean(existingPost.status === 'published' || existingPost.google_post_id);
    const updateFields = {};

    if (data.content !== undefined) {
      updateFields.content = escapeLiteral(data.content);
    }
    if (data.topic_type !== undefined) {
      updateFields.topic_type = escapeLiteral(data.topic_type);
    }

    let sanitizedUrls = null;
    let sanitizedMediaItems = null;
    if (data.media_urls !== undefined || data.media_items !== undefined) {
      const rawUrls = data.media_urls || (data.media_items ? data.media_items.map((m) => m.url) : []);
      sanitizedUrls = await sanitizeMediaUrls(rawUrls, 'posts');
      updateFields.media_urls = formatMediaUrls(sanitizedUrls);
      if (data.media_items && Array.isArray(data.media_items)) {
        sanitizedMediaItems = await sanitizeMediaUrls(data.media_items, 'posts');
      }
    }
    if (data.call_to_action !== undefined) {
      const val = data.call_to_action ? (typeof data.call_to_action === 'string' ? data.call_to_action : JSON.stringify(data.call_to_action)) : null;
      updateFields.call_to_action = `${escapeLiteral(val)}::jsonb`;
    }
    if (data.event_data !== undefined) {
      const val = data.event_data ? (typeof data.event_data === 'string' ? data.event_data : JSON.stringify(data.event_data)) : null;
      updateFields.event_data = `${escapeLiteral(val)}::jsonb`;
    }
    if (data.offer_data !== undefined) {
      const val = data.offer_data ? (typeof data.offer_data === 'string' ? data.offer_data : JSON.stringify(data.offer_data)) : null;
      updateFields.offer_data = `${escapeLiteral(val)}::jsonb`;
    }

    // 1. IF THE POST IS ALREADY PUBLISHED:
    if (isAlreadyPublished) {
      // Must remain published, keep existing published_at and google_post_id, NEVER duplicate or reschedule
      updateFields.status = "'published'";

      // If connected to Google and has a google_post_id, sync the edits directly to Google via PATCH!
      if (existingPost.refresh_token && existingPost.google_post_id) {
        try {
          const rawUrls = sanitizedUrls || data.media_urls || (data.media_items ? data.media_items.map((m) => m.url) : existingPost.media_urls || []);
          const targetUrls = await sanitizeMediaUrls(rawUrls, 'posts');
          const mediaItems = sanitizedMediaItems || targetUrls.map((url) => ({
            url,
            format: url && url.match(/\.(mp4|mov|webm|avi)(\?.*)?$/i) ? 'VIDEO' : 'PHOTO',
          }));

          await updatePost(existingPost.refresh_token, existingPost.google_post_id, {
            content: data.content !== undefined ? data.content : existingPost.content,
            callToAction: data.call_to_action !== undefined ? data.call_to_action : existingPost.call_to_action,
            mediaItems,
            eventSchedule: data.event_data !== undefined ? data.event_data : existingPost.event_data,
            offerData: data.offer_data !== undefined ? data.offer_data : existingPost.offer_data,
          });
          console.log(`[API Posts PUT] Post ${id} atualizado com sucesso no Google Meu Negócio (${existingPost.google_post_id})!`);
        } catch (gErr) {
          console.warn(`[API Posts PUT] Falha ao atualizar post existente no Google:`, gErr.message);
          return NextResponse.json({ error: `Erro ao atualizar no Google Meu Negócio: ${gErr.message}` }, { status: 400 });
        }
      }
    } else {
      // 2. IF THE POST IS NOT YET PUBLISHED (DRAFT OU AGENDADO):
      if (data.publish_now && existingPost.refresh_token && existingPost.google_location_id) {
        // User explicitly chose to publish immediately
        try {
          const locationName = `accounts/${existingPost.google_account_id}/locations/${existingPost.google_location_id}`;
          const rawUrls = sanitizedUrls || data.media_urls || (data.media_items ? data.media_items.map((m) => m.url) : existingPost.media_urls || []);
          const targetUrls = await sanitizeMediaUrls(rawUrls, 'posts');
          const mediaItems = sanitizedMediaItems || targetUrls.map((url) => ({
            url,
            format: url && url.match(/\.(mp4|mov|webm|avi)(\?.*)?$/i) ? 'VIDEO' : 'PHOTO',
          }));

          const primaryMedia = mediaItems.slice(0, 1);
          const gRes = await createPost(existingPost.refresh_token, locationName, {
            content: data.content !== undefined ? data.content : existingPost.content,
            topicType: data.topic_type || existingPost.topic_type || 'STANDARD',
            callToAction: data.call_to_action !== undefined ? data.call_to_action : existingPost.call_to_action,
            mediaItems: primaryMedia,
            eventSchedule: data.event_data !== undefined ? data.event_data : existingPost.event_data,
            offerData: data.offer_data !== undefined ? data.offer_data : existingPost.offer_data,
          });



          updateFields.google_post_id = escapeLiteral(gRes.name);
          updateFields.published_at = 'now()';
          updateFields.status = "'published'";
          updateFields.scheduled_for = 'NULL';
        } catch (gErr) {
          console.warn('[API Posts PUT] Publish to Google failed while updating:', gErr.message);
          return NextResponse.json({ error: `Erro ao publicar no Google: ${gErr.message}` }, { status: 400 });
        }
      } else {
        // Keeping as draft or scheduled without publishing
        if (data.scheduled_for !== undefined) {
          updateFields.scheduled_for = data.scheduled_for ? escapeLiteral(data.scheduled_for) : 'NULL';
        }
        if (data.status !== undefined) {
          updateFields.status = escapeLiteral(data.status);
        } else if (existingPost.status === 'scheduled') {
          updateFields.status = "'scheduled'";
        }
      }
    }

    const setClauses = Object.entries(updateFields).map(([col, val]) => `${col} = ${val}`);

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    await sql(`
      UPDATE public.scheduled_posts p
      SET ${setClauses.join(', ')}, updated_at = now()
      FROM public.clients c
      WHERE p.id = ${escapeLiteral(id)} AND p.client_id = c.id AND c.user_id = ${escapeLiteral(user.id)};
    `);

    const updatedRows = await sql(`
      SELECT p.*,
        json_build_object('id', c.id, 'business_name', c.business_name, 'category', c.category) as clients
      FROM public.scheduled_posts p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = ${escapeLiteral(id)}
      LIMIT 1;
    `);

    return NextResponse.json({ success: true, post: updatedRows?.[0] });
  } catch (error) {
    console.error('[API Posts PUT] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/posts - Delete a post
 */
export async function DELETE(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    await sql(`
      DELETE FROM public.scheduled_posts p
      USING public.clients c
      WHERE p.id = ${escapeLiteral(id)} AND p.client_id = c.id AND c.user_id = ${escapeLiteral(user.id)};
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Posts] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
