'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getProductosConFiltros,
  getCategorias,
  getTiposProductos,
} from '@/lib/supabase-queries';
import type { ProductoCatalogo, Categoria } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TiendaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoriaParam = searchParams.get('categoria');
  const busquedaParam = searchParams.get('busqueda');

  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tiposProductos, setTiposProductos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categoriaParam || null
  );
  const [searchQuery, setSearchQuery] = useState<string>(busquedaParam || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sortBy, setSortBy] = useState<'precio-menor' | 'precio-mayor' | 'novedades' | 'popularidad'>('novedades');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);

  const productosPorPagina = 12;

  // Cargar datos iniciales
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        // Cargar categorías
        const categoriasResult = await getCategorias();
        if (categoriasResult.error) {
          console.error('Error cargando categorías:', categoriasResult.error);
        } else {
          setCategorias(categoriasResult.data || []);
          // Si hay categoría en URL, establecerla
          if (categoriaParam && categoriasResult.data) {
            const categoria = categoriasResult.data.find((c) => c.id === categoriaParam);
            if (categoria) {
              setSelectedCategoryId(categoria.id);
            }
          }
        }

        // Cargar tipos de productos
        const tiposResult = await getTiposProductos();
        if (tiposResult.error) {
          console.error('Error cargando tipos:', tiposResult.error);
        } else {
          setTiposProductos(tiposResult.data || []);
        }

        // Calcular rango de precios desde productos
        const productosTemp = await getProductosConFiltros({ estado: 'Activo' });
        if (productosTemp.data && productosTemp.data.length > 0) {
          const precios = productosTemp.data.map((p) => p.precio_final);
          const minPrecio = Math.max(0, Math.floor(Math.min(...precios)));
          // Redondear hacia arriba el precio máximo para asegurar que todos los productos quepan
          // Agregar un pequeño margen para evitar problemas de redondeo
          const precioMaxReal = Math.max(...precios);
          const maxPrecio = Math.max(1, Math.ceil(precioMaxReal * 1.01)); // Agregar 1% de margen
          setMinPrice(minPrecio);
          setMaxPrice(maxPrecio);
          setPriceRange([minPrecio, maxPrecio]);
        }
      } catch (err) {
        console.error('Error cargando datos iniciales:', err);
        setError('Error al cargar los datos. Por favor, intenta más tarde.');
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [categoriaParam]);

  // Cargar productos cuando cambian los filtros
  useEffect(() => {
    async function loadProductos() {
      try {
        setLoading(true);

        const filters: {
          estado?: 'Activo';
          categoria_id?: string;
          tipo_producto?: string[];
          es_nuevo?: boolean;
          es_best_seller?: boolean;
          es_oferta?: boolean;
          sortBy?: 'precio-menor' | 'precio-mayor' | 'novedades' | 'popularidad';
          limit?: number;
          offset?: number;
          busqueda?: string;
          precio_min?: number;
          precio_max?: number;
        } = {
          estado: 'Activo',
          sortBy,
          limit: productosPorPagina,
          offset: (currentPage - 1) * productosPorPagina,
        };

        if (selectedCategoryId) {
          filters.categoria_id = selectedCategoryId;
        }

        if (selectedTypes.length > 0) {
          filters.tipo_producto = selectedTypes;
        }

        if (searchQuery && searchQuery.trim()) {
          filters.busqueda = searchQuery.trim();
        }

        // Aplicar filtro de precio solo si no está en el rango completo
        // Usar una pequeña tolerancia para evitar problemas de redondeo
        const tolerancia = 0.1;
        const estaEnRangoCompleto = 
          Math.abs(priceRange[0] - minPrice) < tolerancia && 
          Math.abs(priceRange[1] - maxPrice) < tolerancia;
        
        if (!estaEnRangoCompleto) {
          filters.precio_min = Math.max(0, priceRange[0]);
          // Agregar pequeña tolerancia al precio máximo para incluir productos en el límite
          // Esto asegura que productos con precio exactamente igual al límite aparezcan
          filters.precio_max = priceRange[1] + 0.1;
        }

        const result = await getProductosConFiltros(filters);

        if (result.error) {
          console.error('Error cargando productos:', result.error);
          setError(result.error.message);
          setProductos([]);
          setTotalProductos(0);
        } else {
          setProductos(result.data || []);

          // Obtener total para paginación (sin límite)
          const totalFilters = { ...filters };
          delete totalFilters.limit;
          delete totalFilters.offset;
          const totalResult = await getProductosConFiltros(totalFilters);
          if (totalResult.error) {
            console.error('Error obteniendo total:', totalResult.error);
            setTotalProductos(result.data?.length || 0);
          } else {
            setTotalProductos(totalResult.data?.length || 0);
          }
        }
      } catch (err) {
        console.error('Error cargando productos:', err);
        setError(err.message || 'Error al cargar los productos');
        setProductos([]);
        setTotalProductos(0);
      } finally {
        setLoading(false);
      }
    }

    if (categorias.length > 0 || !categoriaParam) {
      loadProductos();
    }
  }, [selectedCategoryId, selectedTypes, priceRange, sortBy, currentPage, categorias.length, categoriaParam, searchQuery, minPrice, maxPrice]);

  // Actualizar búsqueda cuando cambia el parámetro de URL
  useEffect(() => {
    if (busquedaParam) {
      setSearchQuery(busquedaParam);
    } else {
      setSearchQuery('');
    }
  }, [busquedaParam]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setCurrentPage(1); // Resetear a primera página
  };


  const clearFilters = () => {
    setSelectedCategoryId(null);
    setSelectedTypes([]);
    setPriceRange([minPrice, maxPrice]);
    setCurrentPage(1);
  };

  const getEtiqueta = (producto: ProductoCatalogo) => {
    if (producto.es_best_seller) {
      return { tipo: 'best-seller', texto: 'Best Seller' };
    }
    if (producto.es_nuevo) {
      return { tipo: 'new', texto: 'New' };
    }
    if (producto.es_oferta && producto.descuento > 0) {
      return { tipo: 'discount', texto: `-${Math.round(producto.descuento)}%` };
    }
    if (producto.etiqueta_personalizada) {
      return { tipo: 'custom', texto: producto.etiqueta_personalizada };
    }
    return null;
  };

  const getEtiquetaClass = (tipo: string) => {
    switch (tipo) {
      case 'best-seller':
        return 'bg-emerald-100 text-emerald-800';
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'discount':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener categoría seleccionada para el banner
  const categoriaSeleccionada = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categorias.find((c) => c.id === selectedCategoryId);
  }, [selectedCategoryId, categorias]);

  const totalPages = Math.ceil(totalProductos / productosPorPagina);

  if (loading && productos.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Banner */}
      {categoriaSeleccionada && (categoriaSeleccionada.banner_imagen_url || categoriaSeleccionada.imagen_url) && (
        <div className="mb-8 lg:mb-12">
          <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-xl bg-gray-200">
            <Image
              src={categoriaSeleccionada.banner_imagen_url || categoriaSeleccionada.imagen_url || ''}
              alt={categoriaSeleccionada.banner_titulo || categoriaSeleccionada.nombre}
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                {categoriaSeleccionada.banner_titulo || categoriaSeleccionada.nombre}
              </h2>
              {categoriaSeleccionada.banner_descripcion && (
                <p className="mt-2 md:mt-4 max-w-2xl text-base md:text-lg">
                  {categoriaSeleccionada.banner_descripcion}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 xl:gap-12">
        {/* Sidebar Filtros */}
        <aside className="col-span-1 lg:col-span-1">
          <div className="sticky top-24 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtros</h3>
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Limpiar todo
              </button>
            </div>

            {/* Categoría */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Categoría</h4>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setCurrentPage(1);
                  }}
                  className={`block text-sm w-full text-left ${
                    !selectedCategoryId
                      ? 'text-blue-600 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
                  }`}
                >
                  Todas
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setCurrentPage(1);
                    }}
                    className={`block text-sm w-full text-left ${
                      selectedCategoryId === cat.id
                        ? 'text-blue-600 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors'
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Calzado */}
            {tiposProductos.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Tipo de Calzado</h4>
                <div className="space-y-3">
                  {tiposProductos.map((type) => (
                    <label key={type} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleType(type)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Precio */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Precio</h4>
              <div className="space-y-4">
                <div className="relative">
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <div
                      className="absolute h-2 bg-blue-600 dark:bg-blue-500 rounded-lg"
                      style={{
                        left: `${((priceRange[0] - minPrice) / (maxPrice - minPrice)) * 100}%`,
                        width: `${((priceRange[1] - priceRange[0]) / (maxPrice - minPrice)) * 100}%`,
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    value={priceRange[0]}
                    onChange={(e) => {
                      const newMin = Math.min(Number(e.target.value), priceRange[1] - 1);
                      setPriceRange([newMin, priceRange[1]]);
                      setCurrentPage(1);
                    }}
                    className="absolute top-0 w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
                    style={{
                      zIndex: priceRange[0] > priceRange[1] - (maxPrice - minPrice) / 100 ? 5 : 3,
                    }}
                  />
                  <input
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => {
                      const newMax = Math.max(Number(e.target.value), priceRange[0] + 1);
                      setPriceRange([priceRange[0], newMax]);
                      setCurrentPage(1);
                    }}
                    className="absolute top-0 w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
                    style={{
                      zIndex: priceRange[1] < priceRange[0] + (maxPrice - minPrice) / 100 ? 5 : 4,
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Productos */}
        <section className="col-span-1 lg:col-span-3">
          <div className="flex flex-wrap justify-between items-baseline gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {searchQuery
                  ? `Resultados de búsqueda: "${searchQuery}"`
                  : categoriaSeleccionada?.nombre || 'Todos los Productos'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Mostrando {productos.length} de {totalProductos} productos
                {searchQuery && (
                  <button
                    onClick={() => {
                      router.push('/tienda');
                      setSearchQuery('');
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'precio-menor' | 'precio-mayor' | 'novedades' | 'popularidad');
                  setCurrentPage(1);
                }}
                className="rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium focus:ring-blue-500/50 focus:border-blue-500/50 pl-4 pr-10 py-2"
              >
                <option value="popularidad">Popularidad</option>
                <option value="precio-menor">Precio: Menor a Mayor</option>
                <option value="precio-mayor">Precio: Mayor a Menor</option>
                <option value="novedades">Novedades</option>
              </select>
            </div>
          </div>

          {loading && productos.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" />
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No se encontraron productos con los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                {productos.map((producto) => {
                  const etiqueta = getEtiqueta(producto);
                  return (
                    <div key={producto.id} className="group relative flex flex-col">
                      <div className="relative w-full overflow-hidden rounded-xl bg-gray-100">
                        <Link href={`/producto/${producto.id}`}>
                          <div className="relative aspect-[3/4] w-full">
                            {producto.imagen_principal ? (
                              <Image
                                src={producto.imagen_principal}
                                alt={producto.nombre}
                                fill
                                className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-400">Sin imagen</span>
                              </div>
                            )}
                          </div>
                        </Link>
                        {etiqueta && (
                          <span
                            className={`absolute top-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getEtiquetaClass(
                              etiqueta.tipo
                            )}`}
                          >
                            {etiqueta.texto}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex-1">
                        <h3 className="text-sm text-gray-600 dark:text-gray-400">
                          {producto.categoria_nombre || 'Producto'}
                        </h3>
                        <h4 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                          <Link href={`/producto/${producto.id}`} className="hover:text-blue-600">
                            {producto.nombre}
                          </Link>
                        </h4>
                        <div className="mt-2 flex items-baseline gap-2">
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {formatPrice(producto.precio_final)}
                          </p>
                          {producto.precio_original && producto.precio_original > producto.precio_final && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                              {formatPrice(producto.precio_original)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/producto/${producto.id}`}
                        className="mt-4 w-full bg-gray-900 dark:bg-gray-800 text-white rounded-lg h-10 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                      >
                        Añadir al carrito
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <nav className="flex items-center justify-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <ul className="flex items-center -space-x-px h-10 text-sm">
                    <li>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center justify-center px-3 h-10 ms-0 leading-tight text-gray-500 bg-white dark:bg-gray-800 border border-e-0 border-gray-300 dark:border-gray-700 rounded-s-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                    </li>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <li key={pageNum}>
                          <button
                            onClick={() => setCurrentPage(pageNum)}
                            className={`flex items-center justify-center px-4 h-10 leading-tight border ${
                              currentPage === pageNum
                                ? 'z-10 text-white bg-gray-900 dark:bg-gray-700 border-gray-900 dark:border-gray-600 hover:bg-gray-800 dark:hover:bg-gray-600'
                                : 'text-gray-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <li>
                        <button className="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                          ...
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center justify-center px-3 h-10 leading-tight text-gray-500 bg-white dark:bg-gray-800 border border-s-0 border-gray-300 dark:border-gray-700 rounded-e-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
