import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { uploadMediaBuffer } from '@/lib/supabase/storage';

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    const filename = file.name || 'upload.jpg';

    const isVideo = mimeType.startsWith('video/') || filename.match(/\.(mp4|mov|webm|avi)(\?.*)?$/i);
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
