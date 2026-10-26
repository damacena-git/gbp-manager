import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google
 * Initiate Google OAuth2 flow for connecting a GBP account
 */
export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || 'new';

    // Pass user context in state parameter
    const state = JSON.stringify({ userId: user.id, clientId });
    const authUrl = getAuthUrl(state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('[Auth] Error generating auth URL:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
