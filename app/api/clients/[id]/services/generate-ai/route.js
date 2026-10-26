import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import {
  generateServiceDescription,
  generateAllServicesDescriptions,
  suggestServicesForNiche,
  parseAndGenerateBulkServices
} from '@/lib/ai/gemini-service';

/**
 * POST /api/clients/[id]/services/generate-ai
 * AI engine for single description, bulk descriptions, niche suggestions, or raw list parsing
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const clientRows = await sql(`
      SELECT business_name, category, secondary_categories, description, address, seo_audit
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
      } catch {
        city = '';
      }
    }

    // Extract saved SEO audit insights & keywords
    let localKeywords = [];
    let secondaryCategories = [];
    let seoDiagnostic = '';

    if (client.seo_audit) {
      try {
        const audit = typeof client.seo_audit === 'string' ? JSON.parse(client.seo_audit) : client.seo_audit;
        if (audit?.aiSuggestions?.localKeywords) {
          localKeywords = audit.aiSuggestions.localKeywords;
        }
        if (audit?.aiSuggestions?.recommendedSecondaryCategories) {
          secondaryCategories = audit.aiSuggestions.recommendedSecondaryCategories;
        }
        if (audit?.aiSuggestions?.seoDiagnostic) {
          seoDiagnostic = audit.aiSuggestions.seoDiagnostic;
        }
      } catch (auditErr) {
        console.warn('[Generate AI Route] Error parsing seo_audit:', auditErr.message);
      }
    }

    if (client.secondary_categories) {
      try {
        const sec = typeof client.secondary_categories === 'string' ? JSON.parse(client.secondary_categories) : client.secondary_categories;
        if (Array.isArray(sec)) {
          secondaryCategories = Array.from(new Set([...secondaryCategories, ...sec]));
        }
      } catch {}
    }

    const body = await request.json();
    const {
      mode,
      service,
      services,
      rawText,
      neighborhoods: reqNeighborhoods,
      bairros,
      city: reqCity,
      extended,
      maxLength,
    } = body;

    const effectiveCity = reqCity || city || '';
    const effectiveNeighborhoods = reqNeighborhoods || bairros || neighborhood || '';

    // 1. Single service description
    if (mode === 'single') {
      if (!service?.name) {
        return NextResponse.json({ error: 'Nome do serviço é obrigatório' }, { status: 400 });
      }

      const description = await generateServiceDescription({
        businessName: client.business_name,
        category: service.category || client.category,
        secondaryCategories,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        serviceName: service.name,
        existingDescription: service.description,
        businessBio: client.description || '',
        localKeywords,
        seoDiagnostic,
        extended,
        maxLength,
      });

      return NextResponse.json({ success: true, description });
    }

    // 2. Bulk services descriptions
    if (mode === 'bulk') {
      if (!Array.isArray(services) || services.length === 0) {
        return NextResponse.json({ error: 'Lista de serviços vazia' }, { status: 400 });
      }

      const updatedServices = await generateAllServicesDescriptions({
        businessName: client.business_name,
        category: client.category,
        secondaryCategories,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        services,
        businessBio: client.description || '',
        localKeywords,
        extended,
        maxLength,
      });

      return NextResponse.json({ success: true, services: updatedServices });
    }

    // 3. Suggest services for the niche
    if (mode === 'suggest') {
      const suggestions = await suggestServicesForNiche({
        businessName: client.business_name,
        category: client.category,
        secondaryCategories,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        localKeywords,
      });

      return NextResponse.json({ success: true, suggestions });
    }

    // 4. Parse raw text list and generate all services with descriptions
    if (mode === 'parse-raw') {
      if (!rawText || !rawText.trim()) {
        return NextResponse.json({ error: 'Texto com a lista de serviços está vazio' }, { status: 400 });
      }

      const parsedServices = await parseAndGenerateBulkServices({
        businessName: client.business_name,
        category: client.category,
        secondaryCategories,
        city: effectiveCity,
        neighborhood,
        neighborhoods: effectiveNeighborhoods,
        rawText,
        businessBio: client.description || '',
        localKeywords,
      });

      return NextResponse.json({ success: true, services: parsedServices });
    }

    return NextResponse.json({ error: 'Modo inválido (single, bulk, suggest, parse-raw)' }, { status: 400 });
  } catch (error) {
    console.error('[API Services Generate AI] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar com IA' }, { status: 500 });
  }
}
