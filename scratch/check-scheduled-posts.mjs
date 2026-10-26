import { sql } from '../lib/supabase/db.js';

async function main() {
  const posts = await sql(`
    SELECT p.*, c.business_name
    FROM public.scheduled_posts p
    LEFT JOIN public.clients c ON c.id = p.client_id
    WHERE p.status = 'scheduled' OR p.created_at >= '2026-09-12'
    ORDER BY p.created_at DESC;
  `);
  console.log('SCHEDULED POSTS:', JSON.stringify(posts, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
