'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCarrito, getSessionId, clearSessionId } from '@/lib/supabase-queries';
import { getUser, signOut } from '@/lib/auth-helpers';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [carritoCount, setCarritoCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar usuario autenticado
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

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  useEffect(() => {
    async function loadCarritoCount() {
      try {
        const sessionId = getSessionId();
        const result = await getCarrito(undefined, sessionId);
        if (!result.error && result.data) {
          // Sumar todas las cantidades de los items del carrito
          const totalItems = result.data.reduce((sum, item) => sum + item.cantidad, 0);
          setCarritoCount(totalItems);
        } else {
          setCarritoCount(0);
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
      setShowUserMenu(false);
      // Disparar evento para actualizar otros componentes
      window.dispatchEvent(new Event('auth-state-changed'));
      router.push('/');
    } catch (err) {
      console.error('Error:', err);
      alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tienda?busqueda=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleSearchClick = () => {
    setShowSearch(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Cerrar búsqueda al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showSearch && searchInputRef.current && !searchInputRef.current.closest('.search-container')?.contains(event.target as Node)) {
        setShowSearch(false);
      }
    }
    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearch]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="size-7 text-blue-500">
                <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.59L5.41 12 4 13.41 11 20.41l10-10L19.59 9 11 17.59z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold">SOLHANA</h2>
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
            <div className="relative search-container">
              {showSearch ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar productos..."
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <span className="material-symbols-outlined text-xl">search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </form>
              ) : (
                <button
                  onClick={handleSearchClick}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  <span className="material-symbols-outlined text-xl">search</span>
                </button>
              )}
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                {user ? (
                  <span className="material-symbols-outlined text-xl">account_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-xl">person_outline</span>
                )}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </p>
                        {user.user_metadata?.nombre && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {user.user_metadata.nombre}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/perfil"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">person</span>
                          Mi Perfil
                        </span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Cerrar Sesión
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/carrito"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">login</span>
                          Iniciar Sesión
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <Link
              href="/carrito"
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {carritoCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {carritoCount > 99 ? '99+' : carritoCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
