import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { uploadMediaBuffer } from '@/lib/supabase/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'posts';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    const filename = file.name || 'upload.jpg';
    const isVideo = mimeType.startsWith('video/') || Boolean(filename.match(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i));

    // Limit check: 75 MB (Google GBP maximum media upload size)
    const MAX_SIZE = 75 * 1024 * 1024;
    if (file.size && file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'O arquivo excede o limite máximo de 75 MB aceito pelo Google Meu Negócio.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: 'O arquivo excede o limite máximo de 75 MB aceito pelo Google Meu Negócio.' },
        { status: 400 }
      );
    }

    const format = isVideo ? 'VIDEO' : 'PHOTO';

    const publicUrl = await uploadMediaBuffer(buffer, filename, mimeType, folder);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      format,
      filename,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[API Upload Error]', error);
    return NextResponse.json({ error: error.message || 'Erro ao fazer upload da mídia' }, { status: 500 });
  }
}
