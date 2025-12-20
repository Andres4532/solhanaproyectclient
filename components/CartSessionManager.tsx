'use client';

import { useEffect } from 'react';
import { clearSessionId } from '@/lib/supabase-queries';

export default function CartSessionManager() {
  useEffect(() => {
    // No limpiar el carrito en beforeunload: esto borra la sesión
    // cuando se redirige al proveedor OAuth (p. ej. Google).
    // Mantener el session_id para permitir migración server-side.
    const handleBeforeUnload = () => {
      // intentionally left blank to preserve anonymous cart during redirects
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

