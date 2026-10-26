import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google/auth';

/**
 * Fetch and upsert metrics for a client from Google Business Profile Performance API
 */
export async function syncClientPerformanceMetrics(client) {
  if (!client.refresh_token || !client.google_location_id) return 0;

  const now = new Date();
  const endD = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const startD = new Date(endD.getTime() - 88 * 24 * 60 * 60 * 1000); // up to 90 days

  const startDate = { year: startD.getFullYear(), month: startD.getMonth() + 1, day: startD.getDate() };
  const endDate = { year: endD.getFullYear(), month: endD.getMonth() + 1, day: endD.getDate() };

  try {
    const auth = getAuthenticatedClient(client.refresh_token);
    const performance = google.businessprofileperformance({ version: 'v1', auth });

    const res = await performance.locations.fetchMultiDailyMetricsTimeSeries({
      location: `locations/${client.google_location_id}`,
      dailyMetrics: [
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
        'CALL_CLICKS',
        'WEBSITE_CLICKS',
        'BUSINESS_DIRECTION_REQUESTS'
      ],
      'dailyRange.startDate.year': startDate.year,
      'dailyRange.startDate.month': startDate.month,
      'dailyRange.startDate.day': startDate.day,
      'dailyRange.endDate.year': endDate.year,
      'dailyRange.endDate.month': endDate.month,
      'dailyRange.endDate.day': endDate.day,
    });

    const multiSeries = res.data?.multiDailyMetricTimeSeries || [];
    const dateMap = {};

    for (const item of multiSeries) {
      for (const series of item.dailyMetricTimeSeries || []) {
        const metricType = series.dailyMetric;
        for (const dv of series.timeSeries?.datedValues || []) {
          const y = dv.date?.year;
          const m = String(dv.date?.month).padStart(2, '0');
          const d = String(dv.date?.day).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          const val = parseInt(dv.value || '0', 10);

          if (!dateMap[dateStr]) {
            dateMap[dateStr] = {
              views: 0,
              searches: 0,
              phone_calls: 0,
              website_clicks: 0,
              direction_requests: 0,
            };
          }

          if (metricType.includes('IMPRESSIONS')) {
            dateMap[dateStr].views += val;
            if (metricType.includes('SEARCH')) {
              dateMap[dateStr].searches += val;
            }
          } else if (metricType === 'CALL_CLICKS') {
            dateMap[dateStr].phone_calls += val;
          } else if (metricType === 'WEBSITE_CLICKS') {
            dateMap[dateStr].website_clicks += val;
          } else if (metricType === 'BUSINESS_DIRECTION_REQUESTS') {
            dateMap[dateStr].direction_requests += val;
          }
        }
      }
    }

    const dates = Object.keys(dateMap);
    for (const dateStr of dates) {
      const d = dateMap[dateStr];
      const actions = d.phone_calls + d.website_clicks + d.direction_requests;

      await sql(`
        INSERT INTO public.performance_metrics (
          client_id, metric_date, views, searches, actions, direction_requests, phone_calls, website_clicks
        ) VALUES (
          ${escapeLiteral(client.id)},
          '${dateStr}',
          ${d.views},
          ${d.searches},
          ${actions},
          ${d.direction_requests},
          ${d.phone_calls},
          ${d.website_clicks}
        )
        ON CONFLICT (client_id, metric_date) 
        DO UPDATE SET 
          views = EXCLUDED.views,
          searches = EXCLUDED.searches,
          actions = EXCLUDED.actions,
          direction_requests = EXCLUDED.direction_requests,
          phone_calls = EXCLUDED.phone_calls,
          website_clicks = EXCLUDED.website_clicks;
      `);
    }

    return dates.length;
  } catch (err) {
    console.warn(`[SyncMetrics Warning] Client ${client.business_name}:`, err.message);
    return 0;
  }
}

/**
 * GET /api/metrics - Get performance metrics using direct SQL
 */
export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const days = parseInt(searchParams.get('days') || '30', 10);

    const clientFilter = clientId ? `AND pm.client_id = ${escapeLiteral(clientId)}` : '';

    // Query performance metrics directly from Postgres
    let metrics = await sql(`
      SELECT 
        pm.id,
        pm.client_id,
        TO_CHAR(pm.metric_date, 'YYYY-MM-DD') AS metric_date,
        pm.views,
        pm.searches,
        pm.actions,
        pm.direction_requests,
        pm.phone_calls,
        pm.website_clicks,
        c.business_name
      FROM public.performance_metrics pm
      JOIN public.clients c ON c.id = pm.client_id
      WHERE c.user_id = ${escapeLiteral(user.id)}
        AND pm.metric_date >= (CURRENT_DATE - INTERVAL '${days} days')
        ${clientFilter}
      ORDER BY pm.metric_date ASC;
    `);

    // If no metrics found for a specific client, attempt an on-the-fly sync
    if ((!metrics || metrics.length === 0) && clientId) {
      const clientRows = await sql(`
        SELECT id, business_name, google_location_id, refresh_token 
        FROM public.clients 
        WHERE id = ${escapeLiteral(clientId)} AND user_id = ${escapeLiteral(user.id)}
        LIMIT 1;
      `);
      if (clientRows && clientRows[0]?.refresh_token) {
        await syncClientPerformanceMetrics(clientRows[0]);
        // Re-query after sync
        metrics = await sql(`
          SELECT 
            pm.id,
            pm.client_id,
            TO_CHAR(pm.metric_date, 'YYYY-MM-DD') AS metric_date,
            pm.views,
            pm.searches,
            pm.actions,
            pm.direction_requests,
            pm.phone_calls,
            pm.website_clicks,
            c.business_name
          FROM public.performance_metrics pm
          JOIN public.clients c ON c.id = pm.client_id
          WHERE c.user_id = ${escapeLiteral(user.id)}
            AND pm.metric_date >= (CURRENT_DATE - INTERVAL '${days} days')
            ${clientFilter}
          ORDER BY pm.metric_date ASC;
        `);
      }
    }

    const safeMetrics = metrics || [];

    // Calculate totals
    const totals = safeMetrics.reduce((acc, m) => ({
      views: acc.views + (Number(m.views) || 0),
      searches: acc.searches + (Number(m.searches) || 0),
      phone_calls: acc.phone_calls + (Number(m.phone_calls) || 0),
      website_clicks: acc.website_clicks + (Number(m.website_clicks) || 0),
      direction_requests: acc.direction_requests + (Number(m.direction_requests) || 0),
    }), { views: 0, searches: 0, phone_calls: 0, website_clicks: 0, direction_requests: 0 });

    return NextResponse.json({
      metrics: safeMetrics.map(m => ({
        ...m,
        views: Number(m.views) || 0,
        searches: Number(m.searches) || 0,
        actions: Number(m.actions) || 0,
        direction_requests: Number(m.direction_requests) || 0,
        phone_calls: Number(m.phone_calls) || 0,
        website_clicks: Number(m.website_clicks) || 0,
        clients: { business_name: m.business_name },
      })),
      totals,
    });
  } catch (error) {
    console.error('[API Metrics] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST /api/metrics/sync - Trigger sync for all clients or a specific client
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { clientId } = body;

    let clientsToSync = [];
    if (clientId) {
      clientsToSync = await sql(`
        SELECT id, business_name, google_location_id, refresh_token
        FROM public.clients
        WHERE id = ${escapeLiteral(clientId)} AND user_id = ${escapeLiteral(user.id)};
      `);
    } else {
      clientsToSync = await sql(`
        SELECT id, business_name, google_location_id, refresh_token
        FROM public.clients
        WHERE user_id = ${escapeLiteral(user.id)} AND refresh_token IS NOT NULL AND google_location_id IS NOT NULL;
      `);
    }

    let syncedCount = 0;
    for (const client of clientsToSync) {
      const count = await syncClientPerformanceMetrics(client);
      if (count > 0) syncedCount++;
    }

    return NextResponse.json({ success: true, syncedProfiles: syncedCount });
  } catch (error) {
    console.error('[API Metrics Sync] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar métricas' }, { status: 500 });
  }
}
