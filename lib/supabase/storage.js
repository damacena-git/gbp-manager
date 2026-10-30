import { createServiceRoleClient } from './server';

const BUCKET_NAME = 'gbp-media';

/**
 * Ensures the public storage bucket exists
 */
export async function ensureBucketExists() {
  try {
    const supabase = createServiceRoleClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    const found = buckets?.some((b) => b.name === BUCKET_NAME || b.id === BUCKET_NAME);
    if (!found) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }
  } catch (err) {
    console.warn('[Storage] ensureBucketExists warning:', err.message);
  }
}

/**
 * Creates a signed upload URL for direct client-to-storage upload (bypasses serverless payload limits)
 */
export async function createSignedMediaUploadUrl(filename = 'file.mp4', mimeType = 'video/mp4', folder = 'posts') {
  await ensureBucketExists();
  const supabase = createServiceRoleClient();

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filePath = `${folder}/${uniqueId}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUploadUrl(filePath);
  if (error) {
    throw new Error(`Erro ao gerar signed upload URL no Supabase Storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Uploads a buffer or file to Supabase Storage and returns the public URL
 */
export async function uploadMediaBuffer(buffer, filename = 'file.jpg', mimeType = 'image/jpeg', folder = 'posts') {
  await ensureBucketExists();
  const supabase = createServiceRoleClient();

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filePath = `${folder}/${uniqueId}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error('[Storage Upload Error]', error);
    throw new Error(`Erro ao enviar arquivo para o Storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return urlData.publicUrl;
}

/**
 * Converts a base64 Data URL (data:image/jpeg;base64,...) to buffer and uploads to Storage
 */
export async function uploadBase64DataUrl(dataUrl, folder = 'posts') {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/s);
  if (!matches) {
    return dataUrl;
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  const ext = extMap[mimeType] || 'bin';
  const filename = `media_${Date.now()}.${ext}`;

  return await uploadMediaBuffer(buffer, filename, mimeType, folder);
}

/**
 * Sanitizes an array of media URLs or media items, converting any base64 data URLs to public Supabase Storage URLs
 */
export async function sanitizeMediaUrls(mediaList, folder = 'posts') {
  if (!Array.isArray(mediaList) || mediaList.length === 0) {
    return [];
  }

  const sanitized = [];
  for (const item of mediaList) {
    if (typeof item === 'string') {
      if (item.startsWith('data:')) {
        const publicUrl = await uploadBase64DataUrl(item, folder);
        sanitized.push(publicUrl);
      } else {
        sanitized.push(item);
      }
    } else if (item && typeof item === 'object') {
      const url = item.url;
      if (typeof url === 'string' && url.startsWith('data:')) {
        const publicUrl = await uploadBase64DataUrl(url, folder);
        sanitized.push({
          ...item,
          url: publicUrl,
        });
      } else {
        sanitized.push(item);
      }
    }
  }

  return sanitized;
}
