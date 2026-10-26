const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.trim().split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testOthers() {
  const qPosts = await supabase.from('scheduled_posts').select('*, clients(id, business_name, category)');
  console.log('scheduled_posts with clients join error:', qPosts.error);

  const qReviews = await supabase.from('reviews').select('*, clients(id, business_name)');
  console.log('reviews with clients join error:', qReviews.error);
}

testOthers();
