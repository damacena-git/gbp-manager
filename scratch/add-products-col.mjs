import { sql } from '../lib/supabase/db.js';

async function main() {
  console.log('Checking and adding products column to clients table...');
  await sql(`
    ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;
  `);
  console.log('Column products added successfully!');

  const cols = await sql(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'clients' AND table_schema = 'public' AND column_name = 'products';
  `);
  console.log('Verified column:', cols);
}

main().catch(console.error);
