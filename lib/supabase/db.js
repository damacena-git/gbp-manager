/**
 * Direct PostgreSQL Query Helper
 *
 * - Com DATABASE_URL (Supabase na nuvem, banco Central): conexão direta via `pg`,
 *   usando o pooler de transação (porta 6543).
 * - Sem DATABASE_URL (Supabase self-hosted): endpoint /pg/query, como antes.
 *
 * Nos dois casos retorna um array de linhas, com datas como string ISO e números como number,
 * igual ao formato que o /pg/query devolvia.
 */
import pg from 'pg';

const { Pool, types } = pg;

// Mesmo formato do /pg/query: datas como texto, bigint/numeric como número
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8
types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function sql(query) {
  if (process.env.DATABASE_URL) {
    try {
      const result = await getPool().query(query);
      // Várias instruções numa string: o pg devolve um array de resultados; usa o último
      const last = Array.isArray(result) ? result[result.length - 1] : result;
      return last?.rows ?? [];
    } catch (err) {
      console.error('[DB SQL Error]', err.message);
      throw new Error(`DB Error: ${err.message}`);
    }
  }

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
