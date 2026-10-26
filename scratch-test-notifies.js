const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.trim().split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim();
  }
});

async function reload() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const queries = [
    "NOTIFY pgrst, 'reload schema';",
    "NOTIFY pgrst, 'reload config';",
    "NOTIFY pgrst_watch;",
    "NOTIFY db_watch;"
  ];

  for (const q of queries) {
    const res = await fetch(`${url}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({ query: q })
    });
    console.log(q, res.status);
  }
}

reload();
