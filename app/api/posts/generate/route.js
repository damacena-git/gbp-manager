import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generatePost, generateBulkPosts } from '@/lib/ai/gemini-service';

/**
 * POST /api/posts/generate - Generate single or bulk posts using Gemini AI
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const {
      client_id,
      topic,
      tone,
      type,
      count = 1,
      interval_days = 3,
      start_date = null,
      neighborhoods: reqNeighborhoods,
      bairros,
      city: reqCity,
    } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Extract saved SEO audit insights & local keywords
    let localKeywords = [];
    if (client.seo_audit) {
      try {
        const audit = typeof client.seo_audit === 'string' ? JSON.parse(client.seo_audit) : client.seo_audit;
        if (audit?.aiSuggestions?.localKeywords) {
          localKeywords = audit.aiSuggestions.localKeywords;
        }
      } catch {}
    }

    let addr = {};
    if (client.address) {
      try {
        addr = typeof client.address === 'string' ? JSON.parse(client.address) : client.address;
      } catch {}
    }

    const city = reqCity || addr.locality || addr.administrativeArea || '';
    const neighborhood = addr.sublocality || addr.neighborhood || '';
    const neighborhoods = reqNeighborhoods || bairros || neighborhood || '';

    const businessInfo = {
      name: client.business_name,
      category: client.category,
      description: client.description,
      location: addr.formattedAddress || city || '',
      city,
      neighborhood,
      neighborhoods,
      localKeywords,
    };

    if (count > 1) {
      const posts = await generateBulkPosts(
        businessInfo,
        topic || 'Atrair mais clientes e destacar serviços',
        count,
        tone || 'profissional',
        interval_days || 3,
        start_date
      );
      return NextResponse.json({ success: true, posts });
    }

    const generated = await generatePost(
      businessInfo,
      topic || 'Destaque de serviços',
      tone || 'profissional',
      type || 'STANDARD'
    );

    return NextResponse.json({ success: true, generated });
  } catch (error) {
    console.error('[API Generate Post] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar post' }, { status: 500 });
  }
}

