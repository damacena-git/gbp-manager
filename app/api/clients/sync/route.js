import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import {
  listReviews,
  listPosts,
  getLocation,
  parseGoogleLocationDetails,
  fetchLocationServices,
  fetchLocationPhotos,
  fetchLocationAttributes,
} from '@/lib/google/gbp-service';

const STAR_MAP = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * POST /api/clients/sync - Synchronize Google Reviews, Posts, Services, Photos, and Ratings for a client
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    const clientRows = await sql(`
      SELECT * FROM public.clients 
      WHERE id = ${escapeLiteral(clientId)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clientRows && clientRows[0];
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (!client.refresh_token || !client.google_account_id || !client.google_location_id) {
      return NextResponse.json({ error: 'Cliente não está conectado ao Google com conta e local válidos' }, { status: 400 });
    }

    const locationName = `accounts/${client.google_account_id}/locations/${client.google_location_id}`;
    console.log(`[Sync] Starting sync for ${client.business_name} (${locationName})...`);

    // 0. Sync Profile, Categories, Opening Hours & Socials from Google
    try {
      const locData = await getLocation(client.refresh_token, `locations/${client.google_location_id}`);
      const attributes = await fetchLocationAttributes(client.refresh_token, client.google_location_id);
      if (locData) {
        const parsed = parseGoogleLocationDetails(locData, client, attributes);
        await sql(`
          UPDATE public.clients SET
            business_name = ${escapeLiteral(parsed.business_name)},
            category = ${escapeLiteral(parsed.category)},
            secondary_categories = ${escapeLiteral(JSON.stringify(parsed.secondary_categories))}::jsonb,
            description = ${escapeLiteral(parsed.description)},
            phone = ${escapeLiteral(parsed.phone)},
            website = ${escapeLiteral(parsed.website)},
            address = ${escapeLiteral(JSON.stringify(parsed.address))}::jsonb,
            opening_hours = ${escapeLiteral(JSON.stringify(parsed.opening_hours))}::jsonb,
            social_links = ${escapeLiteral(JSON.stringify(parsed.social_links))}::jsonb,
            google_place_id = COALESCE(${escapeLiteral(parsed.google_place_id)}, google_place_id),
            google_maps_uri = COALESCE(${escapeLiteral(parsed.google_maps_uri)}, google_maps_uri),
            google_new_review_uri = COALESCE(${escapeLiteral(parsed.google_new_review_uri)}, google_new_review_uri),
            last_sync_at = now()
          WHERE id = ${escapeLiteral(client.id)};
        `);
        console.log(`[Sync] Profile, categories & social links updated for ${parsed.business_name}:`, JSON.stringify(parsed.social_links));
      }
    } catch (locErr) {
      console.warn(`[Sync] Could not update location profile:`, locErr.message);
    }

    // 1. Sync Reviews & Ratings
    const reviewsData = await listReviews(client.refresh_token, locationName);
    console.log(`[Sync] Reviews fetched: ${reviewsData.reviews?.length || 0}, rating: ${reviewsData.averageRating}, total: ${reviewsData.totalReviewCount}`);

    let syncedReviews = 0;
    for (const rev of (reviewsData.reviews || [])) {
      const reviewId = rev.reviewId;
      const reviewerName = rev.reviewer?.displayName || 'Anônimo';
      const reviewerPhoto = rev.reviewer?.profilePhotoUrl || null;
      const starRating = STAR_MAP[rev.starRating] || (typeof rev.starRating === 'number' ? rev.starRating : 5);
      const comment = rev.comment || '';
      const reply = rev.reviewReply?.comment || null;
      const replyStatus = rev.reviewReply ? 'sent' : 'pending';
      const reviewedAt = rev.createTime || rev.updateTime || new Date().toISOString();
      const repliedAt = rev.reviewReply?.updateTime || null;

      await sql(`
        INSERT INTO public.reviews (
          client_id, google_review_id, reviewer_name, reviewer_photo_url,
          star_rating, comment, reply, reply_status, reviewed_at, replied_at
        ) VALUES (
          ${escapeLiteral(client.id)},
          ${escapeLiteral(reviewId)},
          ${escapeLiteral(reviewerName)},
          ${escapeLiteral(reviewerPhoto)},
          ${starRating},
          ${escapeLiteral(comment)},
          ${escapeLiteral(reply)},
          ${escapeLiteral(replyStatus)},
          ${escapeLiteral(reviewedAt)},
          ${escapeLiteral(repliedAt)}
        )
        ON CONFLICT (google_review_id) DO UPDATE SET
          reply = EXCLUDED.reply,
          reply_status = EXCLUDED.reply_status,
          replied_at = EXCLUDED.replied_at;
      `);
      syncedReviews++;
    }

    // Update client ratings in database
    const avgRating = reviewsData.averageRating || 0;
    const totalReviews = reviewsData.totalReviewCount || (reviewsData.reviews?.length || 0);

    await sql(`
      UPDATE public.clients SET
        average_rating = ${avgRating},
        total_reviews = ${totalReviews},
        last_sync_at = now()
      WHERE id = ${escapeLiteral(client.id)};
    `);

    // 2. Sync Local Posts
    const postsData = await listPosts(client.refresh_token, locationName);
    console.log(`[Sync] Posts fetched from Google: ${postsData.length}`);

    let syncedPosts = 0;
    for (const post of postsData) {
      const postId = post.name;
      const content = post.summary || '';
      const mediaUrls = (post.media || []).map((m) => m.googleUrl).filter(Boolean);
      const publishedAt = post.createTime || post.updateTime || new Date().toISOString();

      // Check if post already exists
      const existing = await sql(`
        SELECT id FROM public.scheduled_posts
        WHERE google_post_id = ${escapeLiteral(postId)} OR (client_id = ${escapeLiteral(client.id)} AND content = ${escapeLiteral(content)})
        LIMIT 1;
      `);

      if (!existing || existing.length === 0) {
        const mediaUrlsSql = mediaUrls.length > 0
          ? `ARRAY[${mediaUrls.map(u => escapeLiteral(u)).join(', ')}]::text[]`
          : `'{}'::text[]`;

        await sql(`
          INSERT INTO public.scheduled_posts (
            client_id, content, media_urls, topic_type,
            published_at, google_post_id, status, scheduled_for
          ) VALUES (
            ${escapeLiteral(client.id)},
            ${escapeLiteral(content)},
            ${mediaUrlsSql},
            ${escapeLiteral(post.topicType || 'STANDARD')},
            ${escapeLiteral(publishedAt)},
            ${escapeLiteral(postId)},
            'published',
            ${escapeLiteral(publishedAt)}
          );
        `);
        syncedPosts++;
      }
    }

    // 3. Sync Services from Google Business Information API
    let syncedServices = 0;
    try {
      const { services: googleServices } = await fetchLocationServices(
        client.refresh_token,
        client.google_location_id
      );
      if (googleServices && googleServices.length > 0) {
        const existingServices = Array.isArray(client.services)
          ? client.services
          : (typeof client.services === 'string' ? JSON.parse(client.services || '[]') : []);

        const existingMap = new Map();
        for (const s of existingServices) {
          if (s.name) existingMap.set(s.name.toLowerCase().trim(), s);
          if (s.service_type_id) existingMap.set(s.service_type_id, s);
        }

        const mergedServices = googleServices.map((gs) => {
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
          SET services = ${escapeLiteral(JSON.stringify(mergedServices))}::jsonb,
              updated_at = now()
          WHERE id = ${escapeLiteral(client.id)};
        `);
        syncedServices = mergedServices.length;
        console.log(`[Sync] Services synced from Google: ${syncedServices}`);
      }
    } catch (servErr) {
      console.warn(`[Sync] Could not sync services:`, servErr.message);
    }

    // 4. Sync Photos / Media from Google My Business API v4
    let syncedPhotos = 0;
    try {
      const mediaItems = await fetchLocationPhotos(
        client.refresh_token,
        client.google_account_id,
        client.google_location_id
      );
      console.log(`[Sync] Photos fetched from Google: ${mediaItems.length}`);

      if (mediaItems && mediaItems.length > 0) {
        for (const item of mediaItems) {
          if (!item.googleUrl) continue;
          const googlePhotoId = item.name;
          const category = item.locationAssociation?.category || 'ADDITIONAL';
          const createdTime = item.createTime || new Date().toISOString();

          const existing = await sql(`
            SELECT id FROM public.photos
            WHERE client_id = ${escapeLiteral(client.id)}
              AND (google_photo_id = ${escapeLiteral(googlePhotoId)} OR url = ${escapeLiteral(item.googleUrl)})
            LIMIT 1;
          `);

          if (!existing || existing.length === 0) {
            await sql(`
              INSERT INTO public.photos (
                client_id, google_photo_id, url, thumbnail_url, category,
                status, uploaded_at, created_at
              ) VALUES (
                ${escapeLiteral(client.id)},
                ${escapeLiteral(googlePhotoId)},
                ${escapeLiteral(item.googleUrl)},
                ${escapeLiteral(item.thumbnailUrl || item.googleUrl)},
                ${escapeLiteral(category)},
                'uploaded',
                ${escapeLiteral(createdTime)},
                ${escapeLiteral(createdTime)}
              );
            `);
            syncedPhotos++;
          } else {
            await sql(`
              UPDATE public.photos SET
                google_photo_id = ${escapeLiteral(googlePhotoId)},
                thumbnail_url = ${escapeLiteral(item.thumbnailUrl || item.googleUrl)},
                category = ${escapeLiteral(category)}
              WHERE id = ${escapeLiteral(existing[0].id)};
            `);
          }
        }
      }
    } catch (photoErr) {
      console.warn(`[Sync] Could not sync photos:`, photoErr.message);
    }

    console.log(`[Sync] Finished. Reviews: ${syncedReviews}, Posts: ${syncedPosts}, Services: ${syncedServices}, Photos: ${syncedPhotos}`);

    return NextResponse.json({
      success: true,
      reviewsCount: syncedReviews,
      postsCount: syncedPosts,
      servicesCount: syncedServices,
      photosCount: syncedPhotos,
      averageRating: avgRating,
      totalReviews,
    });
  } catch (error) {
    console.error('[API Sync] Error syncing client data:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar' }, { status: 500 });
  }
}

