'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BannerCarousel from '@/components/BannerCarousel';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  getBannersFromConfig,
  getProductosDestacados,
  getCategoriasParaHome,
  getDisenoPaginaBySeccion,
  getCategoriasSeleccionadasHome,
} from '@/lib/supabase-queries';
import type { ProductoCatalogo, Categoria } from '@/types/database';
import { formatPrice } from '@/lib/utils';

export default function HomeContent() {
  const [banners, setBanners] = useState<any[]>([]);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [configNovedades, setConfigNovedades] = useState<any>(null);
  const [configCategorias, setConfigCategorias] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar datos
  const loadHomeData = async (showLoading = true) => {
    try {
      // Mostrar loading solo en carga inicial o refresh manual
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Cargar banners - SOLO de la base de datos
      const bannersResult = await getBannersFromConfig();
      if (bannersResult.error) {
        console.error('Error cargando banners:', bannersResult.error);
        setBanners([]); // Asegurar que no hay banners si hay error
      } else {
        const bannersData = bannersResult.data || [];
        // Filtrar duplicados adicional por si acaso
        const uniqueBanners = bannersData.filter((banner, index, self) => 
          index === self.findIndex((b) => b.id === banner.id)
        );
        console.log(`✅ Banners cargados desde BD: ${uniqueBanners.length} únicos de ${bannersData.length} totales`);
        console.log('📋 IDs de banners que se mostrarán:', uniqueBanners.map(b => b.id));
        // SOLO usar banners de la BD, no agregar ningún banner predeterminado
        setBanners(uniqueBanners);
      }

      // Cargar productos destacados
      const productosResult = await getProductosDestacados(5);
      if (productosResult.error) {
        console.error('Error cargando productos:', productosResult.error);
      } else {
        setProductos(productosResult.data || []);
      }

      // Cargar configuración de secciones primero
      const novedadesConfig = await getDisenoPaginaBySeccion('novedades', 'seccion');
      if (!novedadesConfig.error && novedadesConfig.data) {
        setConfigNovedades(novedadesConfig.data.configuracion);
      }

      const categoriasConfig = await getDisenoPaginaBySeccion('categorias', 'seccion');
      if (!categoriasConfig.error && categoriasConfig.data) {
        setConfigCategorias(categoriasConfig.data.configuracion);
      }

      // Cargar categorías seleccionadas desde la configuración
      const categoriasResult = await getCategoriasSeleccionadasHome();
      if (categoriasResult.error) {
        console.error('Error cargando categorías:', categoriasResult.error);
        // Fallback a categorías por defecto
        const fallbackResult = await getCategoriasParaHome(4);
        setCategorias(fallbackResult.data || []);
      } else {
        setCategorias(categoriasResult.data || []);
      }
    } catch (err) {
      console.error('Error general cargando datos:', err);
      setError('Error al cargar los datos. Por favor, intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData(true); // Carga inicial con loading

    // Configurar polling para actualizar datos cada 5 segundos
    // Esto asegura que los cambios de visibilidad y orden se reflejen automáticamente
    const intervalId = setInterval(() => {
      console.log('🔄 Actualizando datos automáticamente...');
      loadHomeData(false); // Refresh automático sin loading spinner
    }, 5000); // Actualizar cada 5 segundos

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, []);

  // Función para refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHomeData(true); // Refresh manual con loading
    setRefreshing(false);
  };

  const scrollLeft = () => {
    const container = document.getElementById('products-scroll');
    if (container) {
      container.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('products-scroll');
    if (container) {
      container.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Banner Carousel */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* Sección Explorar / Productos Destacados */}
      {configNovedades?.mostrar !== false && productos.length > 0 && (
        <div className="mt-12 md:mt-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-gray-900 dark:text-white text-2xl font-bold">
              {configNovedades?.titulo || 'Explorar'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={scrollLeft}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <button
                onClick={scrollRight}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="relative -mx-4">
            <div
              id="products-scroll"
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-5 px-4"
            >
              {productos.map((producto) => (
                <div
                  key={producto.id}
                  className="flex h-full flex-1 flex-col gap-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm w-64 flex-shrink-0 snap-start"
                >
                  {producto.imagen_principal ? (
                    <Link href={`/producto/${producto.id}`}>
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={producto.imagen_principal}
                          alt={producto.nombre}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Link>
                  ) : (
                    <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  )}
                  <div className="flex flex-col flex-1 justify-between p-3 pt-0">
                    <div>
                      <p className="text-gray-900 dark:text-white text-base font-semibold line-clamp-2">
                        {producto.nombre}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {formatPrice(Number(producto.precio_final || producto.precio))}
                      </p>
                      {producto.precio_original && producto.descuento > 0 && (
                        <p className="text-gray-400 dark:text-gray-500 text-xs line-through">
                          {formatPrice(Number(producto.precio_original))}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/producto/${producto.id}`}
                      className="mt-3 w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-600/20 dark:hover:bg-blue-600/30"
                    >
                      <span>Ver Producto</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección Comprar por Categoría */}
      {configCategorias?.mostrar !== false && categorias.length > 0 && (
        <div className="mt-12 md:mt-16">
          <h2 className="text-gray-900 dark:text-white text-2xl font-bold mb-5">
            {configCategorias?.titulo || 'Comprar por Categoría'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {categorias.map((categoria) => {
              // Usar imagen_url de la categoría (puede venir de la BD o de la configuración)
              const imagenCategoria = categoria.imagen_url;
              
              if (!imagenCategoria) {
                // Si no hay imagen, no mostrar esta categoría o mostrar placeholder
                return null;
              }
              
              return (
                <Link
                  key={categoria.id}
                  href={`/tienda?categoria=${categoria.id}`}
                  className="relative group overflow-hidden rounded-xl aspect-[4/3]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url('${imagenCategoria}')`,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative flex h-full flex-col items-center justify-center p-6 text-white">
                    <h3 className="text-3xl font-bold">{categoria.nombre}</h3>
                    <span className="mt-3 text-sm font-semibold underline underline-offset-4">
                      Comprar Ahora
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Sección Beneficios */}
      <div className="mt-12 md:mt-16">
        <div className="bg-white dark:bg-gray-800 rounded-xl py-10 px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Envío Gratis</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-xs">
                En todos los pedidos superiores a $50. Enviamos a cualquier parte del país.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined text-2xl">eco</span>
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                Materiales Sostenibles
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-xs">
                Elaborado con materiales ecológicos para un planeta mejor.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined text-2xl">support_agent</span>
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Soporte 24/7</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-xs">
                Nuestro equipo está aquí para ayudarte con cualquier pregunta o inquietud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

