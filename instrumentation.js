export async function register() {
  // Do not run background intervals during next build
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // On Vercel (serverless) there is no long-lived process: scheduling is done by Vercel Cron (vercel.json -> /api/cron)
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    try {
      const { startPostScheduler } = await import('@/lib/scheduler/cron-service');
      startPostScheduler();
    } catch (err) {
      console.warn('[Instrumentation] Could not start post scheduler:', err.message);
    }
  }
}
