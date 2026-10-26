import { sql } from '../lib/supabase/db.js';

async function main() {
  const cols = await sql(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'clients' AND table_schema = 'public';
  `);
  console.log('Columns in clients:', cols.map((c) => c.column_name));
}

main().catch(console.error);
