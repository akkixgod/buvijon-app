import { File } from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Upload a local image to Supabase Storage and return its public URL.
 * Returns null on failure.
 */
export async function uploadPostImage(localUri: string): Promise<string | null> {
  try {
    const file = new File(localUri);
    const ext = file.extension?.replace('.', '') || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `posts/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('post-images')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('uploadPostImage failed:', err);
    return null;
  }
}
