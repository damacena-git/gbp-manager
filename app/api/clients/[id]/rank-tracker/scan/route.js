import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { executeGridScan } from '@/lib/google/rank-checker';

export async function POST(request, { params }) {
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

    const body = await request.json();
    const { keyword, gridSize = 5, radiusKm = 3, centerCoords } = body;

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: 'Palavra-chave é obrigatória para a varredura' }, { status: 400 });
    }

    // 1. Fetch client
    const clientRows = await sql(`
      SELECT * FROM public.clients 
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clientRows && clientRows[0];
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // 2. Execute Grid Scan
    const scanResult = await executeGridScan({
      client,
      keyword: keyword.trim(),
      gridSize: Number(gridSize) || 5,
      radiusKm: Number(radiusKm) || 3,
      centerCoords,
    });

    // 3. Save scan into client's rank_tracker_scans array (keep up to 20 most recent)
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

    // Prepend new scan and limit to 20
    const updatedHistory = [scanResult, ...history].slice(0, 20);

    await sql(`
      UPDATE public.clients
      SET 
        rank_tracker_scans = ${escapeLiteral(JSON.stringify(updatedHistory))}::jsonb,
        updated_at = NOW()
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)};
    `);

    return NextResponse.json({
      success: true,
      scan: scanResult,
      historyCount: updatedHistory.length,
    });
  } catch (error) {
    console.error('[API Rank Tracker Scan] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao executar varredura de rank' }, { status: 500 });
  }
}
