import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Obtener variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Función para crear el cliente de Supabase
function createSupabaseClient(): SupabaseClient {
  // Validar que las variables de entorno estén presentes
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '⚠️  Supabase environment variables are not set. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
    );
    // Usar valores que pasen la validación de formato pero no funcionarán en runtime
    // Esto permite que el build complete, pero las funciones fallarán si se intentan usar
    const fallbackUrl = 'https://missing-env-vars.supabase.co';
    const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pc3NpbmctZW52LXZhcnMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTE5MjAwMCwiZXhwIjoxOTYwNzY4MDAwfQ.missing';
    return createClient(fallbackUrl, fallbackKey);
  }

  // Validar formato de URL
  try {
    new URL(supabaseUrl);
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Invalid Supabase URL format:', error);
    // Si la URL no es válida, usar fallback
    const fallbackUrl = 'https://invalid-url.supabase.co';
    const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludmFsaWQtdXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.invalid';
    return createClient(fallbackUrl, fallbackKey);
  }
}

// Exportar el cliente creado
export const supabase = createSupabaseClient();

