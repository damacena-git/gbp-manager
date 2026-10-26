import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateReviewReply } from '@/lib/ai/gemini-service';

/**
 * POST /api/reviews/suggest-reply - Generate AI reply for a review
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const { review_id, tone } = body;

    if (!review_id) {
      return NextResponse.json({ error: 'review_id é obrigatório' }, { status: 400 });
    }

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', review_id)
      .single();

    if (!review) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    let client = null;
    if (review.client_id) {
      const { data: c } = await supabase
        .from('clients')
        .select('*')
        .eq('id', review.client_id)
        .single();
      client = c;
    }

    const businessInfo = {
      name: client?.business_name || 'Nossa Empresa',
      category: client?.category || 'Comércio Local',
    };

    const reviewData = {
      reviewerName: review.reviewer_name,
      rating: review.star_rating,
      comment: review.comment,
    };

    const suggestedReply = await generateReviewReply(reviewData, businessInfo, tone || 'profissional e acolhedor');

    // Save the suggestion
    await supabase
      .from('reviews')
      .update({ ai_suggested_reply: suggestedReply })
      .eq('id', review_id);

    return NextResponse.json({ suggestedReply });
  } catch (error) {
    console.error('[API Suggest Reply] Error:', error);
    return NextResponse.json({ error: 'Erro ao gerar sugestão' }, { status: 500 });
  }
}
