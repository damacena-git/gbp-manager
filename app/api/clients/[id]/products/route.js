import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';

/**
 * GET /api/clients/[id]/products
 * List all products for a specific client.
 */
export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const rows = await sql(`
      SELECT products, business_name, category, address, services, phone, website
      FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const client = rows[0];
    const rawProducts = Array.isArray(client.products)
      ? client.products
      : (typeof client.products === 'string' ? JSON.parse(client.products || '[]') : []);

    const products = (Array.isArray(rawProducts) ? rawProducts : []).map((p, idx) => ({
      ...p,
      id: p.id ? String(p.id) : `prod_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: (p.name || '').trim().slice(0, 58),
      category: (p.category || 'Geral').trim(),
      price: (p.price || '').trim(),
      promo_price: (p.promo_price || '').trim(),
      description: (p.description || '').trim().slice(0, 1000),
      photo_url: (p.photo_url || '').trim(),
      button_type: p.button_type || 'ORDER',
      button_url: (p.button_url || '').trim(),
      is_active: p.is_active !== false,
    }));

    const rawServices = Array.isArray(client.services)
      ? client.services
      : (typeof client.services === 'string' ? JSON.parse(client.services || '[]') : []);

    return NextResponse.json({
      success: true,
      products,
      services_count: rawServices.length,
      client: {
        business_name: client.business_name,
        category: client.category,
        phone: client.phone || '',
        website: client.website || '',
      },
    });
  } catch (error) {
    console.error('[API Products GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar produtos' }, { status: 500 });
  }
}

/**
 * POST /api/clients/[id]/products
 * Perform bulk operations like importing services as products.
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const body = await request.json();
    const { action } = body;

    const rows = await sql(`
      SELECT products, services, business_name, category, phone, website
      FROM public.clients
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const client = rows[0];

    // Action: Import from existing services
    if (action === 'import-services') {
      const rawServices = Array.isArray(client.services)
        ? client.services
        : (typeof client.services === 'string' ? JSON.parse(client.services || '[]') : []);

      if (rawServices.length === 0) {
        return NextResponse.json({ error: 'Nenhum serviço cadastrado na ficha deste cliente para importar.' }, { status: 400 });
      }

      const rawProducts = Array.isArray(client.products)
        ? client.products
        : (typeof client.products === 'string' ? JSON.parse(client.products || '[]') : []);

      const existingNames = new Set(
        rawProducts.map((p) => (p.name || '').trim().toLowerCase()).filter(Boolean)
      );

      const cleanPhone = (client.phone || '').replace(/\D/g, '');
      const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

      const newProducts = [];
      for (let i = 0; i < rawServices.length; i++) {
        const s = rawServices[i];
        const sName = (s.name || '').trim().slice(0, 58);
        if (!sName) continue;

        // Skip if already in products catalog to avoid duplication
        if (existingNames.has(sName.toLowerCase())) continue;

        const msg = encodeURIComponent(`Olá! Tenho interesse no serviço/produto "${sName}" anunciado no Google.`);
        const waUrl = fullPhone ? `https://wa.me/${fullPhone}?text=${msg}` : '';

        newProducts.push({
          id: `prod_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          name: sName,
          category: (s.category || client.category || 'Geral').trim(),
          price: (s.price || '').trim(),
          promo_price: '',
          description: (s.description || '').trim().slice(0, 1000),
          photo_url: '',
          button_type: 'ORDER',
          button_url: waUrl,
          is_active: true,
        });
        existingNames.add(sName.toLowerCase());
      }

      if (newProducts.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'Todos os serviços desta ficha já foram importados anteriormente para o catálogo de produtos.',
          products: rawProducts,
        });
      }

      const merged = [...rawProducts, ...newProducts];
      const productsJson = JSON.stringify(merged);

      await sql(`
        UPDATE public.clients
        SET products = ${escapeLiteral(productsJson)}::jsonb,
            updated_at = now()
        WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)};
      `);

      return NextResponse.json({
        success: true,
        count: newProducts.length,
        message: `${newProducts.length} serviço(s) importado(s) como produto(s) com sucesso!`,
        products: merged,
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida (use action: "import-services")' }, { status: 400 });
  } catch (error) {
    console.error('[API Products POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar produtos' }, { status: 500 });
  }
}

/**
 * PUT /api/clients/[id]/products
 * Save and update products list in Supabase without duplicating.
 */
export async function PUT(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const body = await request.json();
    const { products } = body;

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Lista de produtos inválida' }, { status: 400 });
    }

    // Deduplicate by ID and ensure all have valid IDs
    const seenIds = new Set();
    const normalizedProducts = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      let pid = p.id ? String(p.id) : `prod_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      if (seenIds.has(pid)) {
        // If duplicate id encountered, assign a new unique id
        pid = `prod_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      }
      seenIds.add(pid);

      normalizedProducts.push({
        ...p,
        id: pid,
        name: (p.name || '').trim().slice(0, 58),
        category: (p.category || 'Geral').trim(),
        price: (p.price || '').trim(),
        promo_price: (p.promo_price || '').trim(),
        description: (p.description || '').trim().slice(0, 1000),
        photo_url: (p.photo_url || '').trim(),
        button_type: p.button_type || 'ORDER',
        button_url: (p.button_url || '').trim(),
        is_active: p.is_active !== false,
      });
    }

    const productsJson = JSON.stringify(normalizedProducts);

    await sql(`
      UPDATE public.clients
      SET products = ${escapeLiteral(productsJson)}::jsonb,
          updated_at = now()
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)};
    `);

    return NextResponse.json({
      success: true,
      message: `${normalizedProducts.length} produto(s) salvos com sucesso!`,
      products: normalizedProducts,
    });
  } catch (error) {
    console.error('[API Products PUT] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar produtos' }, { status: 500 });
  }
}

