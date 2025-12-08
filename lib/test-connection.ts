// Utilidad para probar la conexión con Supabase
// Usar solo en desarrollo

import { supabase } from './supabase';

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Verificar variables de entorno
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return {
        success: false,
        message: 'Variables de entorno no configuradas',
        error: 'NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY faltantes',
      };
    }

    // Probar conexión básica
    const { data, error } = await supabase
      .from('categorias')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: 'Error al conectar con Supabase',
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Conexión con Supabase exitosa',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error inesperado',
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

