import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const now = new Date().toISOString();
  console.log('Current ISO time:', now);

  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, clients(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true });

  console.log('Error:', error);
  console.log('Found posts due for publishing:', posts?.length);
  if (posts && posts.length > 0) {
    for (const p of posts) {
      console.log('Post ID:', p.id, 'Client:', p.clients?.business_name, 'Scheduled for:', p.scheduled_for);
    }
  }
}

test().catch(console.error);
