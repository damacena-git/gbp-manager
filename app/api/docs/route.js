import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import {
  PROJECT_METADATA,
  ARCHITECTURE_COMPONENTS,
  AI_PROMPT_RULES,
  API_CATALOG,
  DATABASE_SCHEMA,
  OPERATIONAL_CHECKLIST,
  LIVING_CHANGELOG,
} from '@/lib/docs/project-docs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let liveStats = {
      totalClients: 0,
      totalPosts: 0,
      totalReviews: 0,
      activeAiModel: 'gemini-flash-lite-latest',
      googleConnected: false,
      databaseStatus: 'connected',
    };

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Query counts for current user
        const [clientCount, postCount, reviewCount, userSettings] = await Promise.all([
          sql(`SELECT COUNT(*)::int as count FROM public.clients WHERE user_id = ${escapeLiteral(user.id)};`),
          sql(`SELECT COUNT(*)::int as count FROM public.posts WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = ${escapeLiteral(user.id)});`),
          sql(`SELECT COUNT(*)::int as count FROM public.reviews WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = ${escapeLiteral(user.id)});`),
          sql(`SELECT active_ai_model FROM public.user_settings WHERE user_id = ${escapeLiteral(user.id)} LIMIT 1;`),
        ]);

        const googleLocs = await sql(`
          SELECT COUNT(*)::int as count FROM public.clients 
          WHERE user_id = ${escapeLiteral(user.id)} AND refresh_token IS NOT NULL AND google_location_id IS NOT NULL;
        `);

        liveStats.totalClients = clientCount?.[0]?.count || 0;
        liveStats.totalPosts = postCount?.[0]?.count || 0;
        liveStats.totalReviews = reviewCount?.[0]?.count || 0;
        liveStats.activeAiModel = userSettings?.[0]?.active_ai_model || 'gemini-flash-lite-latest';
        liveStats.googleConnected = (googleLocs?.[0]?.count || 0) > 0;
      }
    } catch (dbErr) {
      console.warn('[API Docs] DB Stats Warning:', dbErr.message);
      liveStats.databaseStatus = 'degraded';
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metadata: PROJECT_METADATA,
      liveStats,
      architecture: ARCHITECTURE_COMPONENTS,
      aiRules: AI_PROMPT_RULES,
      apiCatalog: API_CATALOG,
      databaseSchema: DATABASE_SCHEMA,
      operationalChecklist: OPERATIONAL_CHECKLIST,
      changelog: LIVING_CHANGELOG,
    });
  } catch (error) {
    console.error('[API Docs] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar dados da documentação', details: error.message },
      { status: 500 }
    );
  }
}
