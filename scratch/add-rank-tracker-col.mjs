import { sql } from '../lib/supabase/db.js';

async function main() {
  console.log('Adding rank_tracker_scans column to clients table...');
  await sql(`
    ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS rank_tracker_scans JSONB DEFAULT '[]'::jsonb;
  `);
  console.log('Column rank_tracker_scans added successfully!');

  const cols = await sql(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'clients' AND table_schema = 'public' AND column_name = 'rank_tracker_scans';
  `);
  console.log('Verified column:', cols);
}

main().catch(console.error);
