import { NextResponse } from 'next/server';
import { processScheduledPosts, syncAllReviews, syncAllMetrics, checkFreshness } from '@/lib/scheduler/cron-service';

/**
 * Helper to authenticate cron requests
 */
function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('secret') || searchParams.get('key');
  return token === cronSecret;
}

/**
 * Execute cron tasks by name
 */
async function executeTask(task) {
  switch (task) {
    case 'publish_posts':
      return await processScheduledPosts();
    case 'sync_reviews':
      return await syncAllReviews();
    case 'sync_metrics':
      return await syncAllMetrics();
    case 'check_freshness':
      return await checkFreshness();
    case 'all':
      return {
        posts: await processScheduledPosts(),
        reviews: await syncAllReviews(),
        freshness: await checkFreshness(),
      };
    default:
      return await processScheduledPosts();
  }
}

/**
 * GET /api/cron - Execute scheduled tasks (supported by Vercel Cron, cron-job.org, etc.)
 */
export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const task = searchParams.get('task') || 'publish_posts';
    const result = await executeTask(task);

    return NextResponse.json({ success: true, task, result });
  } catch (error) {
    console.error('[API Cron GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro no cron job' }, { status: 500 });
  }
}

/**
 * POST /api/cron - Execute scheduled tasks
 * Protected by CRON_SECRET to prevent unauthorized access
 */
export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const task = body.task || 'publish_posts';
    const result = await executeTask(task);

    return NextResponse.json({ success: true, task, result });
  } catch (error) {
    console.error('[API Cron POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro no cron job' }, { status: 500 });
  }
}
