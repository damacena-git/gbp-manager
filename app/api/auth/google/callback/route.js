import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google/auth';
import { listAccounts, listLocations, parseGoogleLocationDetails } from '@/lib/google/gbp-service';
import { sql, escapeLiteral } from '@/lib/supabase/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth2 callback
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/clients?error=oauth_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/clients?error=no_code`);
  }

  try {
    const { userId, clientId } = JSON.parse(state || '{}');

    // The state must belong to the user logged in this browser (prevents OAuth CSRF / account linking attacks)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!userId || !user || user.id !== userId) {
      return NextResponse.redirect(`${appUrl}/dashboard/clients?error=invalid_state`);
    }

    // Exchange code for tokens
    console.log('[Auth Callback] Exchanging code for tokens...');
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      console.warn('[Auth Callback] No refresh token returned by Google');
      return NextResponse.redirect(`${appUrl}/dashboard/clients?error=no_refresh_token`);
    }

    console.log('[Auth Callback] Refresh token obtained successfully');

    // Fetch accounts and locations to auto-populate client info
    console.log('[Auth Callback] Fetching Google accounts...');
    const accounts = await listAccounts(tokens.refresh_token);
    console.log(`[Auth Callback] Found ${accounts?.length || 0} accounts:`, accounts?.map((a) => a.name));

    if (!accounts || accounts.length === 0) {
      return NextResponse.redirect(`${appUrl}/dashboard/clients?error=no_accounts_found_no_perfil_google`);
    }

    // If connecting to an existing client, update it
    if (clientId && clientId !== 'new') {
      const account = accounts[0];
      const accountId = account.name.replace('accounts/', '');
      let locations = [];
      try {
        locations = await listLocations(tokens.refresh_token, accountId);
      } catch (locErr) {
        console.warn('[Auth Callback] Could not fetch locations for existing client:', locErr.message);
      }
      const location = locations[0];
      const bName = location?.title || account.accountName || 'Sem nome';
      const locId = location?.name?.split('/').pop() || null;
      const locName = location?.name || null;
      const tokenExpires = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

      await sql(`
        UPDATE public.clients SET
          google_account_id = ${escapeLiteral(accountId)},
          google_location_id = ${escapeLiteral(locId)},
          google_location_name = ${escapeLiteral(locName)},
          refresh_token = ${escapeLiteral(tokens.refresh_token)},
          token_expires_at = ${escapeLiteral(tokenExpires)},
          business_name = ${escapeLiteral(bName)},
          status = 'active',
          last_sync_at = now()
        WHERE id = ${escapeLiteral(clientId)} AND user_id = ${escapeLiteral(userId)};
      `);

      return NextResponse.redirect(`${appUrl}/dashboard/clients/${clientId}?success=connected`);
    }

    // Create new clients for each location found
    let insertedCount = 0;
    for (const account of accounts) {
      const accountId = account.name.replace('accounts/', '');
      let locations = [];
      try {
        console.log(`[Auth Callback] Fetching locations for account ${accountId}...`);
        locations = await listLocations(tokens.refresh_token, accountId);
        console.log(`[Auth Callback] Found ${locations?.length || 0} locations for account ${accountId}`);
      } catch (locErr) {
        console.warn(`[Auth Callback] Error fetching locations for account ${accountId}:`, locErr.message);
      }

      if (!locations || locations.length === 0) {
        // Even if no locations returned yet, register the account
        console.log(`[Auth Callback] Registering account ${account.accountName || accountId} without locations`);
        try {
          const tokenExpires = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
          await sql(`
            INSERT INTO public.clients (
              user_id, business_name, google_account_id, refresh_token,
              token_expires_at, status, last_sync_at
            ) VALUES (
              ${escapeLiteral(userId)},
              ${escapeLiteral(account.accountName || 'Conta Google Negócios')},
              ${escapeLiteral(accountId)},
              ${escapeLiteral(tokens.refresh_token)},
              ${escapeLiteral(tokenExpires)},
              'active',
              now()
            );
          `);
          insertedCount++;
        } catch (insertErr) {
          console.error('[Auth Callback] Error inserting client without location:', insertErr.message);
        }
        continue;
      }

      for (const location of locations) {
        const locationId = location.name?.split('/').pop();

        // Check if this location is already connected
        const existingList = await sql(`
          SELECT id FROM public.clients
          WHERE user_id = ${escapeLiteral(userId)}
            AND google_account_id = ${escapeLiteral(accountId)}
            AND google_location_id = ${escapeLiteral(locationId)}
          LIMIT 1;
        `);
        const existing = existingList && existingList[0];

        if (existing) {
          console.log(`[Auth Callback] Location ${locationId} already exists, updating token...`);
          const tokenExpires = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
          await sql(`
            UPDATE public.clients SET
              refresh_token = ${escapeLiteral(tokens.refresh_token)},
              token_expires_at = ${escapeLiteral(tokenExpires)},
              status = 'active',
              last_sync_at = now()
            WHERE id = ${escapeLiteral(existing.id)};
          `);
          insertedCount++;
          continue;
        }

        const parsed = parseGoogleLocationDetails(location);
        const tokenExpires = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

        try {
          await sql(`
            INSERT INTO public.clients (
              user_id, business_name, google_account_id, google_location_id,
              google_location_name, category, secondary_categories, phone,
              address, description, website, opening_hours, social_links,
              google_place_id, google_maps_uri, google_new_review_uri,
              refresh_token, token_expires_at, status, last_sync_at
            ) VALUES (
              ${escapeLiteral(userId)},
              ${escapeLiteral(parsed.business_name)},
              ${escapeLiteral(accountId)},
              ${escapeLiteral(locationId)},
              ${escapeLiteral(location.name)},
              ${escapeLiteral(parsed.category)},
              ${escapeLiteral(JSON.stringify(parsed.secondary_categories))}::jsonb,
              ${escapeLiteral(parsed.phone)},
              ${escapeLiteral(JSON.stringify(parsed.address))}::jsonb,
              ${escapeLiteral(parsed.description)},
              ${escapeLiteral(parsed.website)},
              ${escapeLiteral(JSON.stringify(parsed.opening_hours))}::jsonb,
              ${escapeLiteral(JSON.stringify(parsed.social_links))}::jsonb,
              ${escapeLiteral(parsed.google_place_id)},
              ${escapeLiteral(parsed.google_maps_uri)},
              ${escapeLiteral(parsed.google_new_review_uri)},
              ${escapeLiteral(tokens.refresh_token)},
              ${escapeLiteral(tokenExpires)},
              'active',
              now()
            );
          `);
          insertedCount++;
          console.log(`[Auth Callback] Successfully created client for location: ${parsed.business_name}`);
        } catch (insertErr) {
          console.error('[Auth Callback] Error creating client:', insertErr.message);
        }
      }
    }

    console.log(`[Auth Callback] Finished. Total clients registered/updated: ${insertedCount}`);
    return NextResponse.redirect(`${appUrl}/dashboard/clients?success=connected`);
  } catch (err) {
    console.error('[Auth Callback] Unhandled error:', err);
    const msg = err.message ? encodeURIComponent(err.message.substring(0, 120)) : 'callback_failed';
    return NextResponse.redirect(`${appUrl}/dashboard/clients?error=${msg}`);
  }
}
