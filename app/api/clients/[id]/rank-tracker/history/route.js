import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';

export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    }

    const clientRows = await sql(`
      SELECT id, business_name, category, rank_tracker_scans 
      FROM public.clients 
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clientRows && clientRows[0];
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    let history = [];
    if (client.rank_tracker_scans) {
      try {
        history = typeof client.rank_tracker_scans === 'string'
          ? JSON.parse(client.rank_tracker_scans)
          : client.rank_tracker_scans;
        if (!Array.isArray(history)) history = [];
      } catch (pErr) {
        history = [];
      }
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        business_name: client.business_name,
        category: client.category,
      },
      scans: history,
    });
  } catch (error) {
    console.error('[API Rank Tracker History] Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar histórico de varreduras' }, { status: 500 });
  }
}
