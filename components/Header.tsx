'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { getCarrito, getSessionId, clearSessionId, getConfiguracionTienda } from '@/lib/supabase-queries';
import { getUser, signOut } from '@/lib/auth-helpers';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [carritoCount, setCarritoCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [nombreTienda, setNombreTienda] = useState<string>('SOLHANA');
  const [mensajeCarrito, setMensajeCarrito] = useState<string | null>(null);
  const carritoCountAnteriorRef = useRef<number>(0);

  // Cargar usuario autenticado y logo
  useEffect(() => {
    async function loadUser() {
      const { user: currentUser } = await getUser();
      setUser(currentUser);
    }
    loadUser();

    // Escuchar cambios de autenticación
    const handleAuthChange = () => {
      loadUser();
    };
    window.addEventListener('auth-state-changed', handleAuthChange);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, []);

  // Cargar logo y nombre de la tienda desde la configuración
  useEffect(() => {
    async function loadConfig() {
      try {
        const configResult = await getConfiguracionTienda('general');
        if (configResult.data && configResult.data.valor) {
          if (configResult.data.valor.logo_url) {
            setLogoUrl(configResult.data.valor.logo_url);
          }
          if (configResult.data.valor.nombre_tienda) {
            setNombreTienda(configResult.data.valor.nombre_tienda);
          }
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    async function loadCarritoCount() {
      try {
        const sessionId = getSessionId();
        const result = await getCarrito(undefined, sessionId);
        if (!result.error && result.data) {
          // Sumar todas las cantidades de los items del carrito
          const totalItems = result.data.reduce((sum, item) => sum + item.cantidad, 0);
          const previousCount = carritoCountAnteriorRef.current;
          
          // Mostrar mensaje si se agregó un producto (el contador aumentó)
          if (totalItems > previousCount) {
            const itemsAgregados = totalItems - previousCount;
            if (itemsAgregados === 1) {
              setMensajeCarrito('Producto agregado');
            } else {
              setMensajeCarrito(`${itemsAgregados} productos agregados`);
            }
            // Ocultar mensaje después de 3 segundos
            setTimeout(() => setMensajeCarrito(null), 3000);
          }
          
          setCarritoCount(totalItems);
          carritoCountAnteriorRef.current = totalItems;
        } else {
          setCarritoCount(0);
          carritoCountAnteriorRef.current = 0;
        }
      } catch (err) {
        console.error('Error cargando contador del carrito:', err);
      }
    }

    loadCarritoCount();

    // Actualizar cada 2 segundos para reflejar cambios más rápido
    const interval = setInterval(loadCarritoCount, 2000);
    
    // Escuchar eventos de actualización del carrito
    const handleCarritoUpdate = () => {
      loadCarritoCount();
    };
    window.addEventListener('carrito-updated', handleCarritoUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('carrito-updated', handleCarritoUpdate);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error cerrando sesión:', error);
        alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
        return;
      }
      // Limpiar session_id y carrito al cerrar sesión
      clearSessionId();
      setUser(null);
      // Disparar evento para actualizar otros componentes
      window.dispatchEvent(new Event('auth-state-changed'));
      router.push('/');
    } catch (err) {
      console.error('Error:', err);
      alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
    }
  };


  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-gray-900 dark:text-white">
              {logoUrl ? (
                <div className="relative h-7 w-7 flex-shrink-0">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    fill
                    className="object-contain"
                    sizes="28px"
                  />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-blue-500 flex-shrink-0"></div>
              )}
              <h2 className="text-xl font-bold">{nombreTienda}</h2>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/tienda"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/tienda'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Tienda
              </Link>
              <Link
                href="/categorias"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/categorias'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Categorías
              </Link>
              <Link
                href="/sobre-nosotros"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/sobre-nosotros'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Sobre Nosotros
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {/* Icono de búsqueda removido del topbar - ahora está en la página de tienda */}
            <div className="relative">
              <Link
                href="/carrito"
                className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                <span className="material-symbols-outlined text-xl">shopping_cart</span>
                {carritoCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {carritoCount > 99 ? '99+' : carritoCount}
                  </span>
                )}
              </Link>
              {mensajeCarrito && (
                <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap z-50 animate-fade-in pointer-events-none">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {mensajeCarrito}
                  </div>
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-green-600 transform rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
