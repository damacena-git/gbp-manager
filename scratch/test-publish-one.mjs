import { createClient } from '@supabase/supabase-js';
import { createPost } from '../lib/google/gbp-service.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: post, error } = await supabase
    .from('scheduled_posts')
    .select('*, clients(*)')
    .eq('id', '02aa7247-e392-4ed5-aef3-31d5f67f1ea0')
    .single();

  if (error || !post) {
    console.error('Post not found:', error);
    return;
  }

  console.log('Testing post publishing:');
  console.log('Client:', post.clients.business_name);
  console.log('Location ID:', post.clients.google_location_id);
  console.log('Account ID:', post.clients.google_account_id);
  console.log('Has refresh token:', Boolean(post.clients.refresh_token));
  console.log('Post Content:', post.content);
  console.log('Media URLs:', post.media_urls);
  console.log('Call to action:', post.call_to_action);

  const locationName = `accounts/${post.clients.google_account_id}/locations/${post.clients.google_location_id}`;
  console.log('Location name:', locationName);

  try {
    const result = await createPost(post.clients.refresh_token, locationName, {
      content: post.content,
      topicType: post.topic_type,
      callToAction: post.call_to_action,
      mediaItems: post.media_urls?.map((url) => {
        const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
        return { url, format: isVideo ? 'VIDEO' : 'PHOTO' };
      }),
    });

    console.log('✅ Google API Success:', result);
    
    // Update DB
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        google_post_id: result.name,
      })
      .eq('id', post.id);

    console.log('✅ Database updated to published!');
  } catch (err) {
    console.error('❌ Google API Error:', err);
  }
}

test().catch(console.error);
