import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { generateBusinessDescription } from '@/lib/ai/gemini-service';

/**
 * POST /api/clients/[id]/description-ai
 * Generates an SEO-optimized Google Business Profile description (under 750 chars) using Gemini AI
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const clientRows = await sql(`
      SELECT business_name, category, secondary_categories, address, services, description
      FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const client = clientRows[0];

    // Extract city and neighborhood
    let city = '';
    let neighborhood = '';
    if (client.address) {
      try {
        const addr = typeof client.address === 'string' ? JSON.parse(client.address) : client.address;
        city = addr.locality || addr.administrativeArea || '';
        neighborhood = addr.sublocality || addr.addressLines?.[1] || '';
      } catch {
        city = '';
      }
    }

    // Extract services list
    let services = [];
    if (client.services) {
      try {
        services = Array.isArray(client.services)
          ? client.services
          : (typeof client.services === 'string' ? JSON.parse(client.services) : []);
      } catch {
        services = [];
      }
    }

    // Secondary categories
    let secCats = [];
    if (client.secondary_categories) {
      try {
        secCats = Array.isArray(client.secondary_categories)
          ? client.secondary_categories
          : (typeof client.secondary_categories === 'string' ? JSON.parse(client.secondary_categories) : []);
      } catch {
        secCats = [];
      }
    }

    const body = await request.json().catch(() => ({}));
    const { tone = 'persuasivo', differential = '', existingDescription = client.description || '' } = body;

    const description = await generateBusinessDescription({
      businessName: client.business_name,
      category: client.category,
      secondaryCategories: secCats,
      city,
      neighborhood,
      services,
      tone,
      differential,
      existingDescription,
    });

    return NextResponse.json({
      success: true,
      description,
      charCount: description.length,
    });
  } catch (error) {
    console.error('[API Description AI] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar descrição com IA' }, { status: 500 });
  }
}
