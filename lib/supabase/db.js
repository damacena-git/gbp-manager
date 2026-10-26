/**
 * Direct PostgreSQL Query Helper via Supabase /pg/query
 * Bypasses PostgREST schema cache, ensuring 100% reliability
 * on custom or self-hosted Supabase instances without requiring container restarts.
 */

export async function sql(query) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or Service Role Key missing in environment variables');
  }

  const res = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[DB SQL Error]', res.status, errorText);
    throw new Error(`DB Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Helper to safely escape string for SQL literals
 */
export function escapeLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return `${val}`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}
