import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import {
  generateProductDescription,
  suggestProductsForNiche,
  parseAndGenerateBulkProducts,
  extractProductsFromUrl,
} from '@/lib/ai/gemini-service';

/**
 * POST /api/clients/[id]/products/generate-ai
 * AI engine for single product description, niche product suggestions, bulk text parsing, or website URL extraction
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const clientRows = await sql(`
      SELECT business_name, category, secondary_categories, description, address, seo_audit, website
      FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const client = clientRows[0];
    let city = '';
    let neighborhood = '';
    if (client.address) {
      try {
        const addr = typeof client.address === 'string' ? JSON.parse(client.address) : client.address;
        city = addr.locality || addr.administrativeArea || '';
        neighborhood = addr.sublocality || addr.neighborhood || '';
      } catch {}
    }

    let localKeywords = [];
    if (client.seo_audit) {
      try {
        const audit = typeof client.seo_audit === 'string' ? JSON.parse(client.seo_audit) : client.seo_audit;
        if (audit?.aiSuggestions?.localKeywords) {
          localKeywords = audit.aiSuggestions.localKeywords;
        }
      } catch {}
    }

    const body = await request.json();
    const {
      mode,
      product,
      rawText,
      url,
      neighborhoods: reqNeighborhoods,
      city: reqCity,
    } = body;

    const effectiveCity = reqCity || city || '';
    const effectiveNeighborhoods = reqNeighborhoods || neighborhood || '';

    // 1. Single product description
    if (mode === 'single') {
      if (!product?.name) {
        return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 });
      }

      const description = await generateProductDescription({
        businessName: client.business_name,
        category: client.category,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        productName: product.name,
        productCategory: product.category,
        price: product.price,
        existingDescription: product.description,
        businessBio: client.description || '',
        localKeywords,
      });

      return NextResponse.json({ success: true, description });
    }

    // 2. Suggest niche products
    if (mode === 'suggest') {
      const suggestions = await suggestProductsForNiche({
        businessName: client.business_name,
        category: client.category,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        localKeywords,
      });

      return NextResponse.json({ success: true, suggestions });
    }

    // 3. Parse raw text list of products
    if (mode === 'parse-raw') {
      if (!rawText || !rawText.trim()) {
        return NextResponse.json({ error: 'Texto da lista de produtos está vazio' }, { status: 400 });
      }

      const parsedProducts = await parseAndGenerateBulkProducts({
        businessName: client.business_name,
        category: client.category,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        rawText,
        businessBio: client.description || '',
        localKeywords,
      });

      return NextResponse.json({ success: true, products: parsedProducts });
    }

    // 4. Extract products from business Website or Menu URL
    if (mode === 'extract-url') {
      const targetUrl = (url || client.website || '').trim();
      if (!targetUrl) {
        return NextResponse.json({ error: 'Nenhuma URL informada ou cadastrada para esta empresa.' }, { status: 400 });
      }

      const parsedProducts = await extractProductsFromUrl({
        url: targetUrl,
        businessName: client.business_name,
        category: client.category,
        city: effectiveCity,
      });

      return NextResponse.json({ success: true, products: parsedProducts, sourceUrl: targetUrl });
    }

    return NextResponse.json({ error: 'Modo inválido (single, suggest, parse-raw, extract-url)' }, { status: 400 });
  } catch (error) {
    console.error('[API Products Generate AI] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar produto com IA' }, { status: 500 });
  }
}
