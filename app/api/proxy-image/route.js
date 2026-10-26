import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Blocks loopback, private, link-local and metadata addresses (SSRF protection)
 */
function isPrivateAddress(address) {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a.startsWith('::ffff:')) return isPrivateAddress(a.slice(7));
    return a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80');
  }
  const [a, b] = address.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function isSafePublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addresses.length > 0 && !addresses.some(({ address }) => isPrivateAddress(address));
  } catch {
    return false;
  }
}

/**
 * GET /api/proxy-image?url=https://...
 * Safe server-side proxy to fetch remote images and serve them with CORS headers.
 * Avoids tainted canvas and CORS blocks during client-side image editing.
 */
export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl || !(await isSafePublicUrl(imageUrl))) {
      return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 });
    }

    const response = await fetch(imageUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    // Follow a single redirect only if the target is also a safe public URL
    let finalResponse = response;
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      const nextUrl = new URL(response.headers.get('location'), imageUrl).toString();
      if (!(await isSafePublicUrl(nextUrl))) {
        return NextResponse.json({ error: 'Redirecionamento bloqueado' }, { status: 400 });
      }
      finalResponse = await fetch(nextUrl, { redirect: 'error' });
    }

    if (!finalResponse.ok) {
      return NextResponse.json(
        { error: `Falha ao baixar imagem: ${finalResponse.statusText}` },
        { status: finalResponse.status }
      );
    }

    const contentType = finalResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'O recurso remoto não é uma imagem' }, { status: 415 });
    }

    const arrayBuffer = await finalResponse.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande' }, { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[proxy-image] Erro ao buscar imagem remota:', error);
    return NextResponse.json({ error: error.message || 'Erro no proxy de imagem' }, { status: 500 });
  }
}
