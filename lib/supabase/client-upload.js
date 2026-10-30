/**
 * Direct client-to-storage upload helper
 * Bypasses Vercel Serverless Function 4.5 MB request body limit
 * Supports files up to 75 MB (videos and high-res photos)
 */
export async function uploadMediaDirect(file, folder = 'posts') {
  if (!file) throw new Error('Nenhum arquivo para upload');

  const mimeType = file.type || (file.name?.match(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i) ? 'video/mp4' : 'image/jpeg');
  const filename = file.name || (mimeType.startsWith('video/') ? 'video.mp4' : 'foto.jpg');

  // 1. Request Signed Upload URL from server (tiny JSON payload ~100 bytes)
  const signRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      mimeType,
      size: file.size,
      folder,
    }),
  });

  let signData = null;
  try {
    signData = await signRes.json();
  } catch {
    const errText = await signRes.text().catch(() => '');
    throw new Error(`Falha ao obter autorização de upload (${signRes.status}): ${errText || 'Resposta inválida do servidor'}`);
  }

  if (!signRes.ok || !signData?.signedUrl) {
    throw new Error(signData?.error || 'Erro ao gerar link de upload.');
  }

  // 2. Direct upload to Supabase Storage signed URL (completely bypasses Vercel proxy)
  const uploadRes = await fetch(signData.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    throw new Error(`Falha no upload para o Storage (${uploadRes.status}): ${errText || uploadRes.statusText}`);
  }

  return {
    url: signData.publicUrl,
    format: signData.format || (mimeType.startsWith('video/') ? 'VIDEO' : 'PHOTO'),
    size: file.size,
    name: filename,
  };
}
