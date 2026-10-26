import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';

/**
 * GET /api/reviews - List reviews for a client
 */
export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const replyStatus = searchParams.get('replyStatus');

    let whereClauses = [`c.user_id = ${escapeLiteral(user.id)}`];
    if (clientId) whereClauses.push(`r.client_id = ${escapeLiteral(clientId)}`);
    if (replyStatus) whereClauses.push(`r.reply_status = ${escapeLiteral(replyStatus)}`);

    const whereStr = `WHERE ${whereClauses.join(' AND ')}`;

    const reviews = await sql(`
      SELECT r.*,
        json_build_object('id', c.id, 'business_name', c.business_name, 'category', c.category) as clients
      FROM public.reviews r
      JOIN public.clients c ON c.id = r.client_id
      ${whereStr}
      ORDER BY r.reviewed_at DESC;
    `);

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error) {
    console.error('[API Reviews] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PUT /api/reviews - Update review reply
 */
export async function PUT(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const { id, reply, reply_status } = body;

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const reviews = await sql(`
      SELECT r.*, c.refresh_token, c.google_account_id, c.google_location_id
      FROM public.reviews r
      JOIN public.clients c ON c.id = r.client_id
      WHERE r.id = ${escapeLiteral(id)} AND c.user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const review = reviews && reviews[0];
    if (!review) return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });

    let finalReplyStatus = reply_status || review.reply_status;
    let repliedAt = finalReplyStatus === 'sent' ? 'now()' : 'NULL';

    // If sending the reply, also send to Google
    if (finalReplyStatus === 'sent' && reply && review.refresh_token && review.google_review_id) {
      try {
        const { replyToReview } = await import('@/lib/google/gbp-service');
        const reviewName = `accounts/${review.google_account_id}/locations/${review.google_location_id}/reviews/${review.google_review_id}`;
        await replyToReview(review.refresh_token, reviewName, reply);
      } catch (err) {
        console.error('[API Reviews] Error sending reply to Google:', err.message);
        finalReplyStatus = 'failed';
      }
    }

    const updatedRows = await sql(`
      UPDATE public.reviews SET
        reply = ${escapeLiteral(reply)},
        reply_status = ${escapeLiteral(finalReplyStatus)},
        replied_at = ${repliedAt}
      WHERE id = ${escapeLiteral(id)}
      RETURNING *;
    `);

    return NextResponse.json({ review: updatedRows && updatedRows[0] });
  } catch (error) {
    console.error('[API Reviews] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
