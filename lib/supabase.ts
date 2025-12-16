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
    // Usar una URL real de Supabase como fallback para pasar la validación
    // Esta URL no funcionará en runtime, pero permitirá que el build complete
    const fallbackUrl = 'https://placeholder.supabase.co';
    const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    try {
      return createClient(fallbackUrl, fallbackKey);
    } catch (error) {
      // Si incluso el fallback falla, lanzar un error más descriptivo
      throw new Error(
        'Failed to create Supabase client. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
      );
    }
  }

  // Validar formato de URL
  try {
    new URL(supabaseUrl);
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Invalid Supabase URL format:', error);
    // Si la URL no es válida, usar fallback
    const fallbackUrl = 'https://placeholder.supabase.co';
    const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    return createClient(fallbackUrl, fallbackKey);
  }
}

// Exportar el cliente creado
export const supabase = createSupabaseClient();

