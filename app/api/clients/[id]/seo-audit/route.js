import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { generateLocalSeoAudit } from '@/lib/ai/gemini-service';

export async function GET(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true';

    // 1. Fetch client data
    const clientRows = await sql(`
      SELECT * FROM public.clients 
      WHERE id = ${escapeLiteral(id)} AND user_id = ${escapeLiteral(user.id)}
      LIMIT 1;
    `);

    const client = clientRows && clientRows[0];
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

    // 1.1 If client already has a saved audit and refresh is NOT explicitly requested, return it immediately
    if (!refresh && client.seo_audit) {
      try {
        const savedAudit = typeof client.seo_audit === 'string' ? JSON.parse(client.seo_audit) : client.seo_audit;
        let history = [];
        if (client.seo_audit_history) {
          history = typeof client.seo_audit_history === 'string' ? JSON.parse(client.seo_audit_history) : client.seo_audit_history;
        }

        return NextResponse.json({
          ...savedAudit,
          client: {
            ...savedAudit.client,
            description: client.description || savedAudit.client?.description || '',
            phone: client.phone || savedAudit.client?.phone || '',
            website: client.website || savedAudit.client?.website || '',
          },
          hasSavedAudit: true,
          isSaved: true,
          history,
          audited_at: savedAudit.audited_at || client.updated_at,
        });
      } catch (parseErr) {
        console.warn('[SEO Audit Route] Could not parse saved audit, generating fresh one:', parseErr.message);
      }
    }

    // 1.2 If only_saved requested and no audit exists, return without calling Gemini
    if (!refresh && searchParams.get('only_saved') === 'true') {
      return NextResponse.json({
        hasSavedAudit: false,
        client: {
          id: client.id,
          business_name: client.business_name,
          category: client.category,
        },
      });
    }

    // 2. Fetch reviews stats
    const reviewStats = await sql(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE reply IS NOT NULL)::int AS replied,
        COALESCE(AVG(star_rating), 0) AS avg_stars
      FROM public.reviews 
      WHERE client_id = ${escapeLiteral(id)};
    `);
    const totalReviews = reviewStats?.[0]?.total || client.total_reviews || 0;
    const repliedReviews = reviewStats?.[0]?.replied || 0;
    const responseRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 100;
    const avgRating = Number(client.average_rating) || Number(reviewStats?.[0]?.avg_stars) || 0;

    // 3. Fetch latest post
    const latestPost = await sql(`
      SELECT published_at, created_at 
      FROM public.scheduled_posts 
      WHERE client_id = ${escapeLiteral(id)} 
      ORDER BY COALESCE(published_at, created_at) DESC 
      LIMIT 1;
    `);

    let lastPostDaysAgo = null;
    if (latestPost && latestPost[0]) {
      const postDate = new Date(latestPost[0].published_at || latestPost[0].created_at);
      const diffMs = Date.now() - postDate.getTime();
      lastPostDaysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    // 4. Fetch photos count
    const photosCount = await sql(`
      SELECT COUNT(*)::int AS total 
      FROM public.photos 
      WHERE client_id = ${escapeLiteral(id)};
    `);
    const totalPhotos = photosCount?.[0]?.total || 0;

    // 5. Parse Address
    let addressStr = '';
    let cityStr = '';
    if (client.address) {
      if (typeof client.address === 'string') {
        try {
          const parsed = JSON.parse(client.address);
          addressStr = parsed.addressLines?.join(', ') || parsed.locality || client.address;
          cityStr = parsed.locality || '';
        } catch {
          addressStr = client.address;
        }
      } else if (typeof client.address === 'object') {
        addressStr = client.address.addressLines?.join(', ') || client.address.locality || '';
        cityStr = client.address.locality || '';
      }
    }

    // 6. Calculate SEO Score & Checklist
    const checklist = [];
    let relevanceScore = 0; // max 30
    let reputationScore = 0; // max 30
    let activityScore = 0; // max 20
    let napScore = 0; // max 20

    // ---- Relevance (30 pts) ----
    if (client.category && client.category.trim().length > 0) {
      relevanceScore += 15;
      checklist.push({
        pillar: 'Relevância',
        item: 'Categoria Principal Definida',
        status: 'pass',
        detail: `Categoria: "${client.category}"`,
      });
    } else {
      checklist.push({
        pillar: 'Relevância',
        item: 'Categoria Principal Ausente',
        status: 'fail',
        detail: 'Definir a categoria primária é o fator #1 para ranquear no Google Maps.',
      });
    }

    const descLen = client.description ? client.description.trim().length : 0;
    if (descLen >= 350) {
      relevanceScore += 15;
      checklist.push({
        pillar: 'Relevância',
        item: 'Descrição Completa da Empresa',
        status: 'pass',
        detail: `${descLen}/750 caracteres utilizados com profundidade de termos.`,
      });
    } else if (descLen > 100) {
      relevanceScore += 8;
      checklist.push({
        pillar: 'Relevância',
        item: 'Descrição Curta',
        status: 'warning',
        detail: `${descLen}/750 caracteres. Amplie com palavras-chave do nicho para subir posições.`,
      });
    } else {
      checklist.push({
        pillar: 'Relevância',
        item: 'Descrição Ausente ou Muito Curta',
        status: 'fail',
        detail: 'A ficha não possui descrição adequada para ranquear termos locais.',
      });
    }

    // ---- Reputation (30 pts) ----
    if (totalReviews >= 25) {
      reputationScore += 10;
      checklist.push({
        pillar: 'Reputação',
        item: 'Volume Forte de Avaliações',
        status: 'pass',
        detail: `${totalReviews} avaliações reais registradas.`,
      });
    } else if (totalReviews >= 5) {
      reputationScore += 6;
      checklist.push({
        pillar: 'Reputação',
        item: 'Volume Inicial de Avaliações',
        status: 'warning',
        detail: `${totalReviews} avaliações. Estimule mais clientes a avaliar para superar a concorrência.`,
      });
    } else {
      checklist.push({
        pillar: 'Reputação',
        item: 'Poucas ou Nenhuma Avaliação',
        status: 'fail',
        detail: `${totalReviews} avaliações. Perfis com menos de 5 avaliações sofrem queda no Maps.`,
      });
    }

    if (avgRating >= 4.6) {
      reputationScore += 10;
      checklist.push({
        pillar: 'Reputação',
        item: 'Nota de Avaliação Excelente',
        status: 'pass',
        detail: `Média de ${avgRating.toFixed(1)} estrelas.`,
      });
    } else if (avgRating >= 4.0) {
      reputationScore += 7;
      checklist.push({
        pillar: 'Reputação',
        item: 'Boa Avaliação',
        status: 'warning',
        detail: `Média de ${avgRating.toFixed(1)} estrelas. Ideal manter acima de 4.5.`,
      });
    } else if (avgRating > 0) {
      reputationScore += 3;
      checklist.push({
        pillar: 'Reputação',
        item: 'Nota Baixa',
        status: 'fail',
        detail: `Média de ${avgRating.toFixed(1)} estrelas. Requer plano de contenção de reputação.`,
      });
    } else {
      checklist.push({
        pillar: 'Reputação',
        item: 'Sem Nota Calculada',
        status: 'warning',
        detail: 'Aguardando primeiras avaliações para gerar nota.',
      });
    }

    if (responseRate >= 80) {
      reputationScore += 10;
      checklist.push({
        pillar: 'Reputação',
        item: 'Taxa de Resposta Exemplar',
        status: 'pass',
        detail: `${responseRate}% das avaliações foram respondidas. O Google valoriza perfis engajados.`,
      });
    } else if (responseRate >= 40) {
      reputationScore += 5;
      checklist.push({
        pillar: 'Reputação',
        item: 'Respostas Parciais',
        status: 'warning',
        detail: `${responseRate}% respondido. Há avaliações de clientes aguardando resposta.`,
      });
    } else {
      checklist.push({
        pillar: 'Reputação',
        item: 'Baixa Taxa de Resposta',
        status: 'fail',
        detail: `${responseRate}% respondido. Deixar clientes sem resposta derruba a autoridade no GBP.`,
      });
    }

    // ---- Activity & Content (20 pts) ----
    if (lastPostDaysAgo !== null && lastPostDaysAgo <= 14) {
      activityScore += 15;
      checklist.push({
        pillar: 'Atividade',
        item: 'Postagem Recente no Google',
        status: 'pass',
        detail: `Último post publicado há ${lastPostDaysAgo} dias.`,
      });
    } else if (lastPostDaysAgo !== null && lastPostDaysAgo <= 35) {
      activityScore += 8;
      checklist.push({
        pillar: 'Atividade',
        item: 'Frequência de Postagens Média',
        status: 'warning',
        detail: `Último post há ${lastPostDaysAgo} dias. Mantenha postagens semanais.`,
      });
    } else {
      checklist.push({
        pillar: 'Atividade',
        item: 'Sem Postagens Recentes',
        status: 'fail',
        detail: 'Perfis sem postagens recentes perdem prioridade no feed de novidades do Google.',
      });
    }

    if (totalPhotos > 0) {
      activityScore += 5;
      checklist.push({
        pillar: 'Atividade',
        item: 'Galeria com Fotos',
        status: 'pass',
        detail: `${totalPhotos} fotos vinculadas no catálogo.`,
      });
    } else {
      checklist.push({
        pillar: 'Atividade',
        item: 'Poucas Fotos Cadastradas',
        status: 'warning',
        detail: 'Adicionar fotos da fachada, produtos e equipe aumenta cliques em até 42%.',
      });
    }

    // ---- NAP & Contact (20 pts) ----
    if (client.phone && client.phone.trim().length >= 8) {
      napScore += 5;
      checklist.push({
        pillar: 'NAP',
        item: 'Telefone Configurado',
        status: 'pass',
        detail: `Telefone: ${client.phone}`,
      });
    } else {
      checklist.push({
        pillar: 'NAP',
        item: 'Telefone Não Cadastrado',
        status: 'fail',
        detail: 'O botão de ligação no Google Maps depende do telefone cadastrado.',
      });
    }

    if (addressStr && addressStr.length > 5) {
      napScore += 5;
      checklist.push({
        pillar: 'NAP',
        item: 'Endereço Local Validado',
        status: 'pass',
        detail: addressStr,
      });
    } else {
      checklist.push({
        pillar: 'NAP',
        item: 'Endereço Indefinido',
        status: 'warning',
        detail: 'Defina o endereço exato ou configure área de cobertura local.',
      });
    }

    if (client.website && client.website.trim().length > 5) {
      napScore += 5;
      const isHttps = client.website.toLowerCase().startsWith('https://');
      if (isHttps) {
        napScore += 5;
        checklist.push({
          pillar: 'NAP',
          item: 'Website com Conexão Segura (HTTPS)',
          status: 'pass',
          detail: client.website,
        });
      } else {
        checklist.push({
          pillar: 'NAP',
          item: 'Website sem HTTPS',
          status: 'warning',
          detail: 'Seu site não utiliza https://, o que pode gerar avisos de segurança no Google.',
        });
      }
    } else {
      checklist.push({
        pillar: 'NAP',
        item: 'Website Ausente',
        status: 'warning',
        detail: 'Cadastrar um site aumenta a taxa de conversão e gera backlinks locais.',
      });
    }

    const totalScore = Math.min(100, Math.max(10, relevanceScore + reputationScore + activityScore + napScore));

    let tier = 'Crítico';
    let tierColor = '#EF4444';
    if (totalScore >= 85) {
      tier = 'Excelente (Top Local 3-Pack)';
      tierColor = '#10B981';
    } else if (totalScore >= 70) {
      tier = 'Bom (Competitivo)';
      tierColor = '#3B82F6';
    } else if (totalScore >= 50) {
      tier = 'Regular (Oportunidade de Ganho Rápido)';
      tierColor = '#F59E0B';
    }

    // 7. Call Gemini AI for deep Local SEO analysis and optimization suggestions
    const aiData = await generateLocalSeoAudit({
      name: client.business_name,
      category: client.category,
      city: cityStr || addressStr,
      address: addressStr,
      phone: client.phone,
      website: client.website,
      totalReviews,
      averageRating: avgRating,
      responseRate,
      lastPostDaysAgo,
      currentDescription: client.description,
    });

    const nowIso = new Date().toISOString();

    // 8. Prepare audit payload
    const auditPayload = {
      client: {
        id: client.id,
        business_name: client.business_name,
        category: client.category,
        description: client.description || '',
        phone: client.phone,
        website: client.website,
        address: addressStr,
        average_rating: avgRating,
        total_reviews: totalReviews,
      },
      score: totalScore,
      tier,
      tierColor,
      breakdown: {
        relevance: { score: relevanceScore, max: 30 },
        reputation: { score: reputationScore, max: 30 },
        activity: { score: activityScore, max: 20 },
        nap: { score: napScore, max: 20 },
      },
      checklist,
      aiSuggestions: aiData,
      audited_at: nowIso,
    };

    // 9. Update History: archive previous audit score if exists
    let history = [];
    if (client.seo_audit_history) {
      try {
        history = typeof client.seo_audit_history === 'string' ? JSON.parse(client.seo_audit_history) : client.seo_audit_history;
      } catch {
        history = [];
      }
    }

    let previousScore = null;
    if (client.seo_audit) {
      try {
        const prev = typeof client.seo_audit === 'string' ? JSON.parse(client.seo_audit) : client.seo_audit;
        if (prev?.score !== undefined) {
          previousScore = prev.score;
          history.push({
            score: prev.score,
            tier: prev.tier || 'Anterior',
            tierColor: prev.tierColor || '#9CA3AF',
            audited_at: prev.audited_at || nowIso,
          });
        }
      } catch (historyErr) {
        console.warn('[SEO Audit History] Error parsing previous audit:', historyErr.message);
      }
    }

    // 10. Persist to database
    try {
      await sql(`
        UPDATE public.clients SET
          seo_audit = ${escapeLiteral(JSON.stringify(auditPayload))}::jsonb,
          seo_audit_history = ${escapeLiteral(JSON.stringify(history))}::jsonb,
          updated_at = now()
        WHERE id = ${escapeLiteral(id)};
      `);
    } catch (saveErr) {
      console.error('[SEO Audit Save Error]', saveErr.message);
    }

    const scoreDifference = previousScore !== null ? totalScore - previousScore : null;

    return NextResponse.json({
      ...auditPayload,
      isSaved: false,
      isNew: true,
      previousScore,
      scoreDifference,
      history,
    });
  } catch (error) {
    console.error('[API SEO Audit] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao realizar auditoria de SEO' }, { status: 500 });
  }
}
