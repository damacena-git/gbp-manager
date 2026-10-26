import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Cron Service — Handles scheduled tasks for GBP automation
 * Called by API route /api/cron or automatic background scheduler
 */

/**
 * Process all scheduled posts that are due
 */
export async function processScheduledPosts() {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  // Fetch posts that are scheduled and due
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, clients(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('[Cron] Error fetching scheduled posts:', error);
    return { processed: 0, errors: [] };
  }

  if (!posts || posts.length === 0) {
    return { processed: 0, errors: [] };
  }

  const results = { processed: 0, errors: [] };

  for (const post of posts) {
    try {
      if (!post.clients?.refresh_token || !post.clients?.google_location_id) {
        console.warn(`[Cron] Cliente "${post.clients?.business_name || post.client_id}" não possui conexão ativa com o Google Meu Negócio.`);
        continue;
      }

      // Import dynamically to avoid circular deps
      const { createPost } = await import('../google/gbp-service.js');

      const locationName = `accounts/${post.clients.google_account_id}/locations/${post.clients.google_location_id}`;

      const mediaItems = (post.media_urls || []).map((url) => {
        const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('.mp4');
        return { url, format: isVideo ? 'VIDEO' : 'PHOTO' };
      });

      const primaryMedia = mediaItems.slice(0, 1);
      const result = await createPost(post.clients.refresh_token, locationName, {
        content: post.content,
        topicType: post.topic_type || 'STANDARD',
        callToAction: post.call_to_action,
        mediaItems: primaryMedia,
        eventSchedule: post.event_data,
        offerData: post.offer_data,
      });

      // Update post status to published
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          google_post_id: result.name,
        })
        .eq('id', post.id);

      // Log the activity
      await logActivity(supabase, post.client_id, 'post_published', {
        post_id: post.id,
        google_post_id: result.name,
      });

      console.log(`[Cron] Post ${post.id} publicado com sucesso no Google Meu Negócio para ${post.clients.business_name}!`);
      results.processed++;
    } catch (err) {
      console.error(`[Cron] Error publishing post ${post.id}:`, err.message);

      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed' })
        .eq('id', post.id);

      await logActivity(supabase, post.client_id, 'post_failed', {
        post_id: post.id,
        error: err.message,
      });

      results.errors.push({ postId: post.id, error: err.message });
    }
  }

  return results;
}

let schedulerTimer = null;

/**
 * Starts automatic background scheduler polling every 60s
 */
export function startPostScheduler() {
  if (schedulerTimer) return;

  console.log('[Scheduler] Agendador de postagens iniciado (verificação automática a cada 60s)...');

  // Initial check after 3 seconds
  setTimeout(() => {
    processScheduledPosts().catch((err) =>
      console.warn('[Scheduler] Erro na verificação inicial:', err.message)
    );
  }, 3000);

  // Periodic recurring check
  schedulerTimer = setInterval(() => {
    processScheduledPosts().catch((err) =>
      console.warn('[Scheduler] Erro na verificação periódica:', err.message)
    );
  }, 60000);
}

/**
 * Sync reviews for all active clients
 */
export async function syncAllReviews() {
  const supabase = getServiceClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .not('refresh_token', 'is', null);

  if (error || !clients) {
    console.error('[Cron] Error fetching clients for review sync:', error);
    return { synced: 0, errors: [] };
  }

  const results = { synced: 0, newReviews: 0, errors: [] };

  for (const client of clients) {
    try {
      const { listReviews } = await import('../google/gbp-service.js');
      const locationName = `accounts/${client.google_account_id}/locations/${client.google_location_id}`;
      const { reviews } = await listReviews(client.refresh_token, locationName);

      for (const review of reviews) {
        const { data: existing } = await supabase
          .from('reviews')
          .select('id')
          .eq('google_review_id', review.name)
          .single();

        if (!existing) {
          await supabase.from('reviews').insert({
            client_id: client.id,
            google_review_id: review.name,
            reviewer_name: review.reviewer?.displayName || 'Anônimo',
            star_rating: review.starRating ? parseInt(review.starRating.replace('STAR_', '').replace('_', '')) : 0,
            comment: review.comment || '',
            reply: review.reviewReply?.comment || null,
            reply_status: review.reviewReply ? 'sent' : 'pending',
            reviewed_at: review.createTime,
          });
          results.newReviews++;
        }
      }

      results.synced++;
    } catch (err) {
      console.error(`[Cron] Error syncing reviews for client ${client.id}:`, err.message);
      results.errors.push({ clientId: client.id, error: err.message });
    }
  }

  return results;
}

/**
 * Sync performance metrics for all active clients
 */
export async function syncAllMetrics() {
  const supabase = getServiceClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')
    .not('refresh_token', 'is', null);

  if (error || !clients) {
    console.error('[Cron] Error fetching clients for metrics sync:', error);
    return { synced: 0, errors: [] };
  }

  const results = { synced: 0, errors: [] };
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Last 7 days

  for (const client of clients) {
    try {
      const { getPerformanceMetrics } = await import('../google/gbp-service.js');
      const locationName = `accounts/${client.google_account_id}/locations/${client.google_location_id}`;
      const metrics = await getPerformanceMetrics(client.refresh_token, locationName, startDate, endDate);

      if (metrics && metrics.multiDailyMetricTimeSeries) {
        // Process and store daily metrics
        const dailyData = {};

        for (const series of metrics.multiDailyMetricTimeSeries) {
          const metricName = series.dailyMetric;
          if (series.timeSeries?.datedValues) {
            for (const dv of series.timeSeries.datedValues) {
              const dateKey = `${dv.date.year}-${String(dv.date.month).padStart(2, '0')}-${String(dv.date.day).padStart(2, '0')}`;
              if (!dailyData[dateKey]) {
                dailyData[dateKey] = {};
              }
              dailyData[dateKey][metricName] = parseInt(dv.value || '0');
            }
          }
        }

        for (const [date, data] of Object.entries(dailyData)) {
          await supabase
            .from('performance_metrics')
            .upsert({
              client_id: client.id,
              metric_date: date,
              views: (data.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) +
                (data.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) +
                (data.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) +
                (data.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0),
              searches: (data.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) +
                (data.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0),
              phone_calls: data.CALL_CLICKS || 0,
              website_clicks: data.WEBSITE_CLICKS || 0,
              direction_requests: data.BUSINESS_DIRECTION_REQUESTS || 0,
            }, {
              onConflict: 'client_id,metric_date',
            });
        }
      }

      results.synced++;
    } catch (err) {
      console.error(`[Cron] Error syncing metrics for client ${client.id}:`, err.message);
      results.errors.push({ clientId: client.id, error: err.message });
    }
  }

  return results;
}

/**
 * Check freshness — Alert clients with no activity > 7 days
 */
export async function checkFreshness() {
  const supabase = getServiceClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: staleClients, error } = await supabase
    .from('clients')
    .select(`
      id, business_name, user_id,
      scheduled_posts!inner(published_at)
    `)
    .eq('status', 'active')
    .order('published_at', { referencedTable: 'scheduled_posts', ascending: false })
    .limit(1, { referencedTable: 'scheduled_posts' });

  if (error) {
    console.error('[Cron] Error checking freshness:', error);
    return [];
  }

  const stale = (staleClients || []).filter((client) => {
    const lastPost = client.scheduled_posts?.[0]?.published_at;
    return !lastPost || new Date(lastPost) < sevenDaysAgo;
  });

  // Log alerts for stale clients
  for (const client of stale) {
    await logActivity(supabase, client.id, 'freshness_alert', {
      message: `Nenhum post publicado nos últimos 7 dias para ${client.business_name}`,
      last_post: client.scheduled_posts?.[0]?.published_at || 'Nunca',
    });
  }

  return stale;
}

/**
 * Log an activity
 */
async function logActivity(supabase, clientId, action, details) {
  await supabase.from('activity_logs').insert({
    client_id: clientId,
    action,
    details,
    status: 'completed',
  });
}
