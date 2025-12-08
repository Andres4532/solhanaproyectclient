// Funciones para gestión de imágenes en Supabase Storage

import { supabase } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido. Use JPEG, PNG, WEBP o GIF' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'El archivo es demasiado grande. Máximo 5MB' };
  }

  return { valid: true };
}

export async function uploadImage(
  file: File,
  bucket: string,
  path: string
): Promise<{ url: string | null; error: Error | null }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { url: null, error: new Error(validation.error) };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { url: null, error: new Error(uploadError.message) };
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { url: data.publicUrl, error: null };
}

export async function deleteImage(
  bucket: string,
  path: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  return { error: error ? new Error(error.message) : null };
}

