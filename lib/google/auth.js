import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

/**
 * Create an OAuth2 client with the configured credentials
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate the URL for the Google OAuth2 consent screen
 * @param {string} state - State parameter (usually client ID or user context)
 */
export function getAuthUrl(state = '') {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 */
export async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated OAuth2 client for a specific user/client
 * @param {string} refreshToken - The stored refresh token
 */
export function getAuthenticatedClient(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Handle token refresh automatically
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      // Store the new refresh token if provided
      console.log('[Google Auth] New refresh token received');
    }
  });

  return oauth2Client;
}

/**
 * Verify if a refresh token is still valid
 * @param {string} refreshToken - The refresh token to verify
 */
export async function verifyToken(refreshToken) {
  try {
    const client = getAuthenticatedClient(refreshToken);
    await client.getAccessToken();
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Revoke a token
 * @param {string} refreshToken - The refresh token to revoke
 */
export async function revokeToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  try {
    await oauth2Client.revokeToken(refreshToken);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
