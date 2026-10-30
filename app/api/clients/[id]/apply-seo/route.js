import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { updateBusinessDescription } from '@/lib/google/gbp-service';

/**
 * POST /api/clients/[id]/apply-seo - Apply optimized SEO fields directly to Google GBP & Supabase
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const body = await request.json();
    const { description, phone, website } = body;

    if (!description && !phone && !website) {
      return NextResponse.json({ error: 'Nenhum dado informado para atualização' }, { status: 400 });
    }

    // 1. Fetch client
    const clientRows = await sql(`
      SELECT * FROM public.clients 
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clientRows && clientRows[0];
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    let googleUpdated = false;
    let googleError = null;

    // 2. If description changed and Google is connected, patch to Google My Business API
    if (description && client.refresh_token && client.google_location_id) {
      try {
        console.log(`[Apply SEO] Updating description for ${client.business_name} in Google...`);
        const gRes = await updateBusinessDescription(client.refresh_token, client.google_location_id, description);
        if (gRes && gRes.success) {
          googleUpdated = true;
        } else {
          googleUpdated = false;
          googleError = gRes?.error || 'Falha ao atualizar descrição na API do Google';
          console.warn(`[Apply SEO Google Warning] ${client.business_name}:`, googleError);
        }
      } catch (err) {
        console.warn(`[Apply SEO Google Warning] ${client.business_name}:`, err.message);
        googleError = err.message;
      }
    }

    // 3. Update database
    const updates = [];
    if (description !== undefined) updates.push(`description = ${escapeLiteral(description)}`);
    if (phone !== undefined) updates.push(`phone = ${escapeLiteral(phone)}`);
    if (website !== undefined) updates.push(`website = ${escapeLiteral(website)}`);
    updates.push(`updated_at = now()`);

    await sql(`
      UPDATE public.clients 
      SET ${updates.join(', ')}
      WHERE id = ${escapeLiteral(id)};
    `);

    // 4. Record activity log
    try {
      const details = JSON.stringify({
        applied_description: Boolean(description),
        google_synced: googleUpdated,
        google_error: googleError,
        timestamp: new Date().toISOString(),
      });
      await sql(`
        INSERT INTO public.activity_logs (client_id, user_id, action, details, status)
        VALUES (
          ${escapeLiteral(id)},
          ${escapeLiteral(user.id)},
          'seo_update',
          ${escapeLiteral(details)}::jsonb,
          'success'
        );
      `);
    } catch (logErr) {
      console.warn('[Activity Log Warning]:', logErr.message);
    }

    return NextResponse.json({
      success: true,
      googleUpdated,
      googleWarning: googleError,
      message: googleUpdated
        ? 'Ficha e descrição atualizadas com sucesso no Google Meu Negócio!'
        : 'Alterações salvas com sucesso no sistema!',
    });
  } catch (error) {
    console.error('[API Apply SEO] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao aplicar alterações' }, { status: 500 });
  }
}
