'use client';

import { useEffect } from 'react';
import { clearSessionId } from '@/lib/supabase-queries';

export default function CartSessionManager() {
  useEffect(() => {
    // Limpiar carrito cuando el usuario cierra la pestaña o el navegador
    const handleBeforeUnload = () => {
      clearSessionId();
    };

    // Limpiar carrito cuando la pestaña se oculta (usuario cambia de pestaña o minimiza)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // No limpiar aquí, solo cuando realmente se cierra
        // clearSessionId();
      }
    };

    // Agregar listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null; // Este componente no renderiza nada
}

