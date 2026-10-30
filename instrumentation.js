export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.VERCEL) return;

  // Next build sets NEXT_PHASE=phase-production-build in Next.js internal runtime
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  // If npm run build or next build is running, do not start background timer
  if (process.env.npm_lifecycle_event === 'build') return;

  // Only start in dev server or actual node server runtime
  if (process.env.NODE_ENV === 'production' && !process.env.PORT) {
    return;
  }

  try {
    const { startPostScheduler } = await import('@/lib/scheduler/cron-service');
    startPostScheduler();
  } catch (err) {
    console.warn('[Instrumentation] Could not start post scheduler:', err.message);
  }
}
