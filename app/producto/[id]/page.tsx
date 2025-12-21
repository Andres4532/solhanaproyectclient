'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  getProductoById,
  getProductoImagenes,
  getProductoEspecificaciones,
  getProductoVariantes,
  getProductosRelacionados,
  agregarAlCarrito,
  getSessionId,
  getCarrito,
  actualizarCantidadCarrito,
  eliminarItemCarrito,
} from '@/lib/supabase-queries';
import type { Producto, ProductoImagen, ProductoEspecificacion, ProductoVariante, ProductoCatalogo, CarritoCompleto } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProductoPage() {
  const params = useParams();
  const productoId = params.id as string;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [imagenes, setImagenes] = useState<ProductoImagen[]>([]);
  const [especificaciones, setEspecificaciones] = useState<ProductoEspecificacion[]>([]);
  const [variantes, setVariantes] = useState<ProductoVariante[]>([]);
  const [productosRelacionados, setProductosRelacionados] = useState<ProductoCatalogo[]>([]);
  const [carrito, setCarrito] = useState<CarritoCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imagenPrincipal, setImagenPrincipal] = useState(0);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductoData() {
      try {
        setLoading(true);
        setError(null);

        // Cargar producto
        const productoResult = await getProductoById(productoId);
        if (productoResult.error || !productoResult.data) {
          setError('Producto no encontrado');
          return;
        }
        setProducto(productoResult.data);

        // Cargar imágenes
        const imagenesResult = await getProductoImagenes(productoId);
        if (!imagenesResult.error && imagenesResult.data) {
          setImagenes(imagenesResult.data);
        }

        // Cargar especificaciones
        const especificacionesResult = await getProductoEspecificaciones(productoId);
        if (!especificacionesResult.error && especificacionesResult.data) {
          setEspecificaciones(especificacionesResult.data);
        }

        // Cargar variantes
        const variantesResult = await getProductoVariantes(productoId);
        if (!variantesResult.error && variantesResult.data) {
          setVariantes(variantesResult.data);
          // Extraer colores y tallas de las variantes
          const colores = new Set<string>();
          const tallas = new Set<string>();
          variantesResult.data.forEach((v) => {
            if (v.atributos?.color) colores.add(v.atributos.color);
            if (v.atributos?.talla) tallas.add(v.atributos.talla);
          });
          if (colores.size > 0) setColorSeleccionado(Array.from(colores)[0]);
          if (tallas.size > 0) setTallaSeleccionada(Array.from(tallas)[0]);
        }

        // Cargar productos relacionados
        const relacionadosResult = await getProductosRelacionados(
          productoId,
          productoResult.data.categoria_id,
          productoResult.data.tipo_producto,
          4
        );
        if (!relacionadosResult.error && relacionadosResult.data) {
          setProductosRelacionados(relacionadosResult.data);
        }

        // Cargar carrito para verificar stock disponible
        const sessionId = getSessionId();
        const carritoResult = await getCarrito(undefined, sessionId);
        if (!carritoResult.error && carritoResult.data) {
          setCarrito(carritoResult.data);
        }
      } catch (err) {
        console.error('Error cargando datos del producto:', err);
        setError('Error al cargar el producto. Por favor, intenta más tarde.');
      } finally {
        setLoading(false);
      }
    }

    if (productoId) {
      loadProductoData();
    }

    // Escuchar eventos de actualización del carrito
    const handleCarritoUpdate = async () => {
      const sessionId = getSessionId();
      const carritoResult = await getCarrito(undefined, sessionId);
      if (!carritoResult.error && carritoResult.data) {
        setCarrito(carritoResult.data);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('carrito-updated', handleCarritoUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('carrito-updated', handleCarritoUpdate);
      }
    };
  }, [productoId]);

  // Extraer colores y tallas únicos de las variantes (soporta diferentes formatos de atributos)
  const coloresDisponibles = Array.from(
    new Set(
      variantes
        .map((v) => {
          const attrs = v.atributos || {};
          return attrs.color || attrs.Color || attrs.COLOR || null;
        })
        .filter(Boolean)
    )
  ) as string[];

  const tallasDisponibles = Array.from(
    new Set(
      variantes
        .map((v) => {
          const attrs = v.atributos || {};
          return attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE || null;
        })
        .filter(Boolean)
    )
  ) as string[];

  // Obtener variante seleccionada basada en color y talla
  const varianteSeleccionada = useMemo(() => {
    return variantes.find((v) => {
      const attrs = v.atributos || {};
      const color = attrs.color || attrs.Color || attrs.COLOR;
      const talla = attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE;
      return (
        (!colorSeleccionado || color === colorSeleccionado) &&
        (!tallaSeleccionada || talla === tallaSeleccionada)
      );
    });
  }, [variantes, colorSeleccionado, tallaSeleccionada]);

  // Calcular cantidad en carrito para este producto y variante
  const cantidadEnCarrito = useMemo(() => {
    if (!producto) return 0;
    
    return carrito
      .filter((item) => {
        // Filtrar por producto_id
        if (item.producto_id !== producto.id) return false;
        
        // Si hay variante seleccionada, filtrar también por variante_id
        if (varianteSeleccionada) {
          return item.variante_id === varianteSeleccionada.id;
        }
        
        // Si no hay variante seleccionada pero el producto tiene variantes,
        // contar solo items sin variante o con variante que coincida con color/talla seleccionados
        if (producto.tiene_variantes) {
          // Si hay color o talla seleccionado, filtrar por esos atributos
          if (colorSeleccionado || tallaSeleccionada) {
            const varianteInfo = item.variante_atributos || {};
            const itemColor = item.color || varianteInfo.color || varianteInfo.Color;
            const itemTalla = item.talla || varianteInfo.talla || varianteInfo.Talla;
            
            if (colorSeleccionado && itemColor !== colorSeleccionado) return false;
            if (tallaSeleccionada && itemTalla !== tallaSeleccionada) return false;
          }
        }
        
        return true;
      })
      .reduce((sum, item) => sum + item.cantidad, 0);
  }, [carrito, producto, varianteSeleccionada, colorSeleccionado, tallaSeleccionada]);

  // Stock disponible (usar stock de variante si existe, sino calcular stock total)
  // Restar lo que ya está en el carrito
  const stockDisponible = useMemo(() => {
    let stockBase = 0;
    
    if (varianteSeleccionada) {
      stockBase = varianteSeleccionada.stock;
    } else if (producto?.tiene_variantes && variantes.length > 0) {
      // Si el producto tiene variantes pero no hay variante seleccionada,
      // calcular el stock total sumando todas las variantes activas
      stockBase = variantes
        .filter((v) => v.activo)
        .reduce((sum, v) => sum + v.stock, 0);
    } else {
      // Si no tiene variantes, usar el stock del producto
      stockBase = producto?.stock || 0;
    }
    
    // Restar lo que ya está en el carrito
    return Math.max(0, stockBase - cantidadEnCarrito);
  }, [varianteSeleccionada, producto, variantes, cantidadEnCarrito]);

  // Calcular stock máximo disponible para un item del carrito
  const calcularStockMaximo = (item: CarritoCompleto): number => {
    if (item.variante_id) {
      const variante = variantes.find(v => v.id === item.variante_id);
      return variante?.stock || 0;
    } else {
      const prod = item.producto_id === producto?.id ? producto : null;
      if (prod?.tiene_variantes && variantes.length > 0) {
        return variantes
          .filter((v) => {
            if (!v.activo) return false;
            const attrs = v.atributos || {};
            const vColor = attrs.color || attrs.Color || attrs.COLOR;
            const vTalla = attrs.talla || attrs.Talla || attrs.TALLA;
            
            if (item.color && vColor !== item.color) return false;
            if (item.talla && vTalla !== item.talla) return false;
            return true;
          })
          .reduce((sum, v) => sum + v.stock, 0);
      } else {
        return prod?.stock || 0;
      }
    }
  };

  const incrementarCantidad = async () => {
    // Buscar si el producto ya está en el carrito
    const itemEnCarrito = carrito.find((item) => {
      if (item.producto_id !== producto?.id) return false;
      if (varianteSeleccionada && item.variante_id !== varianteSeleccionada.id) return false;
      if (!varianteSeleccionada && producto?.tiene_variantes) {
        const varianteInfo = item.variante_atributos || {};
        const itemColor = item.color || varianteInfo.color || varianteInfo.Color;
        const itemTalla = item.talla || varianteInfo.talla || varianteInfo.Talla;
        if (colorSeleccionado && itemColor !== colorSeleccionado) return false;
        if (tallaSeleccionada && itemTalla !== tallaSeleccionada) return false;
      }
      return true;
    });

    if (itemEnCarrito && cantidadEnCarrito > 0) {
      // Si ya está en el carrito, actualizar la cantidad directamente
      const stockMax = calcularStockMaximo(itemEnCarrito);
      if (cantidadEnCarrito >= stockMax) {
        alert(`Solo hay ${stockMax} unidades disponibles en stock.`);
        return;
      }
      await handleActualizarCantidad(itemEnCarrito.id, cantidadEnCarrito + 1);
    } else {
      // Si no está en el carrito, solo cambiar el estado local
      setCantidad((prev) => Math.min(prev + 1, stockDisponible));
    }
  };
  
  const decrementarCantidad = async () => {
    // Buscar si el producto ya está en el carrito
    const itemEnCarrito = carrito.find((item) => {
      if (item.producto_id !== producto?.id) return false;
      if (varianteSeleccionada && item.variante_id !== varianteSeleccionada.id) return false;
      if (!varianteSeleccionada && producto?.tiene_variantes) {
        const varianteInfo = item.variante_atributos || {};
        const itemColor = item.color || varianteInfo.color || varianteInfo.Color;
        const itemTalla = item.talla || varianteInfo.talla || varianteInfo.Talla;
        if (colorSeleccionado && itemColor !== colorSeleccionado) return false;
        if (tallaSeleccionada && itemTalla !== tallaSeleccionada) return false;
      }
      return true;
    });

    if (itemEnCarrito && cantidadEnCarrito > 1) {
      // Si ya está en el carrito, actualizar la cantidad directamente
      const nuevaCantidad = Math.max(1, cantidadEnCarrito - 1);
      await handleActualizarCantidad(itemEnCarrito.id, nuevaCantidad);
    } else {
      // Si no está en el carrito, solo cambiar el estado local
      setCantidad((prev) => Math.max(1, prev - 1));
    }
  };
  
  // Verificar si el botón + debe estar deshabilitado
  const botonIncrementarDeshabilitado = useMemo(() => {
    const itemEnCarrito = carrito.find((item) => {
      if (item.producto_id !== producto?.id) return false;
      if (varianteSeleccionada && item.variante_id !== varianteSeleccionada.id) return false;
      if (!varianteSeleccionada && producto?.tiene_variantes) {
        const varianteInfo = item.variante_atributos || {};
        const itemColor = item.color || varianteInfo.color || varianteInfo.Color;
        const itemTalla = item.talla || varianteInfo.talla || varianteInfo.Talla;
        if (colorSeleccionado && itemColor !== colorSeleccionado) return false;
        if (tallaSeleccionada && itemTalla !== tallaSeleccionada) return false;
      }
      return true;
    });

    if (itemEnCarrito) {
      const stockMax = calcularStockMaximo(itemEnCarrito);
      return cantidadEnCarrito >= stockMax;
    } else {
      return cantidad >= stockDisponible || stockDisponible === 0;
    }
  }, [carrito, producto, varianteSeleccionada, colorSeleccionado, tallaSeleccionada, cantidad, stockDisponible, cantidadEnCarrito]);

  // Sincronizar el contador principal con la cantidad en el carrito
  useEffect(() => {
    if (cantidadEnCarrito > 0) {
      setCantidad(cantidadEnCarrito);
    } else {
      setCantidad(1);
    }
  }, [cantidadEnCarrito, colorSeleccionado, tallaSeleccionada]);
  
  // Validar cantidad cuando cambia el stock disponible
  useEffect(() => {
    if (cantidad > stockDisponible && stockDisponible > 0) {
      setCantidad(stockDisponible);
    } else if (stockDisponible === 0 && cantidad > 0) {
      setCantidad(0);
    } else if (stockDisponible > 0 && cantidad === 0) {
      setCantidad(1);
    }
  }, [stockDisponible, cantidad]);

  const handleAgregarAlCarrito = async () => {
    if (!producto || stockDisponible === 0) {
      alert('No hay stock disponible para este producto.');
      return;
    }

    // Validar que la cantidad no exceda el stock disponible
    if (cantidad > stockDisponible) {
      alert(`No puedes agregar más de ${stockDisponible} unidades. Solo hay ${stockDisponible} disponibles.`);
      setCantidad(stockDisponible);
      return;
    }

    if (cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }

    try {
      setAgregando(true);
      setMensajeExito(null);

      // Obtener variante_id si hay variante seleccionada
      const varianteId = varianteSeleccionada?.id || null;

      const result = await agregarAlCarrito({
        producto_id: producto.id,
        variante_id: varianteId,
        cantidad: cantidad,
        precio_unitario: precioFinal,
        color: colorSeleccionado,
        talla: tallaSeleccionada,
        session_id: getSessionId(),
      });

      if (result.error) {
        console.error('Error agregando al carrito:', result.error);
        alert('Error al agregar al carrito. Por favor, intenta de nuevo.');
      } else {
        setMensajeExito('¡Producto agregado al carrito!');
        // Disparar evento para actualizar el contador del header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('carrito-updated'));
        }
        
        // Recargar el carrito para actualizar el stock disponible
        const sessionId = getSessionId();
        const carritoResult = await getCarrito(undefined, sessionId);
        if (!carritoResult.error && carritoResult.data) {
          setCarrito(carritoResult.data);
        }
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMensajeExito(null), 3000);
        // La cantidad se sincronizará automáticamente con el useEffect
      }
    } catch (err) {
      console.error('Error agregando al carrito:', err);
      alert('Error al agregar al carrito. Por favor, intenta de nuevo.');
    } finally {
      setAgregando(false);
    }
  };

  const handleActualizarCantidad = async (carritoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) return;
    
    // Encontrar el item en el carrito
    const itemCarrito = carrito.find(item => item.id === carritoId);
    if (!itemCarrito) return;
    
    // Calcular el stock disponible para este producto/variante
    let stockMaximo = 0;
    
    if (itemCarrito.variante_id) {
      // Si tiene variante, buscar el stock de esa variante
      const variante = variantes.find(v => v.id === itemCarrito.variante_id);
      stockMaximo = variante?.stock || 0;
    } else {
      // Si no tiene variante, usar el stock del producto
      const prod = itemCarrito.producto_id === producto?.id ? producto : null;
      if (prod?.tiene_variantes && variantes.length > 0) {
        // Si el producto tiene variantes, sumar el stock de variantes que coincidan
        stockMaximo = variantes
          .filter((v) => {
            if (!v.activo) return false;
            const attrs = v.atributos || {};
            const vColor = attrs.color || attrs.Color || attrs.COLOR;
            const vTalla = attrs.talla || attrs.Talla || attrs.TALLA;
            
            if (itemCarrito.color && vColor !== itemCarrito.color) return false;
            if (itemCarrito.talla && vTalla !== itemCarrito.talla) return false;
            return true;
          })
          .reduce((sum, v) => sum + v.stock, 0);
      } else {
        stockMaximo = prod?.stock || 0;
      }
    }
    
    // Validar que la nueva cantidad no exceda el stock
    if (nuevaCantidad > stockMaximo) {
      alert(`Solo hay ${stockMaximo} unidades disponibles en stock.`);
      return;
    }
    
    try {
      const result = await actualizarCantidadCarrito(carritoId, nuevaCantidad);
      if (result.error) {
        console.error('Error actualizando cantidad:', result.error);
        alert('Error al actualizar la cantidad');
      } else {
        // Recargar carrito
        const sessionId = getSessionId();
        const carritoResult = await getCarrito(undefined, sessionId);
        if (!carritoResult.error && carritoResult.data) {
          setCarrito(carritoResult.data);
        }
        // Disparar evento para actualizar el contador del header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('carrito-updated'));
        }
      }
    } catch (err) {
      console.error('Error actualizando cantidad:', err);
      alert('Error al actualizar la cantidad');
    }
  };

  const handleEliminarDelCarrito = async (carritoId: string) => {
    try {
      const result = await eliminarItemCarrito(carritoId);
      if (result.error) {
        console.error('Error eliminando del carrito:', result.error);
        alert('Error al eliminar del carrito');
      } else {
        // Recargar carrito
        const sessionId = getSessionId();
        const carritoResult = await getCarrito(undefined, sessionId);
        if (!carritoResult.error && carritoResult.data) {
          setCarrito(carritoResult.data);
        }
        // Disparar evento para actualizar el contador del header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('carrito-updated'));
        }
      }
    } catch (err) {
      console.error('Error eliminando del carrito:', err);
      alert('Error al eliminar del carrito');
    }
  };

  // Filtrar tallas disponibles según color seleccionado (si hay color)
  const tallasDisponiblesPorColor = colorSeleccionado
    ? Array.from(
        new Set(
          variantes
            .filter((v) => {
              const attrs = v.atributos || {};
              const color = attrs.color || attrs.Color || attrs.COLOR;
              return color === colorSeleccionado;
            })
            .map((v) => {
              const attrs = v.atributos || {};
              return attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE || null;
            })
            .filter(Boolean)
        )
      )
    : tallasDisponibles;

  // Filtrar colores disponibles según talla seleccionada (si hay talla)
  const coloresDisponiblesPorTalla = tallaSeleccionada
    ? Array.from(
        new Set(
          variantes
            .filter((v) => {
              const attrs = v.atributos || {};
              const talla = attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE;
              return talla === tallaSeleccionada;
            })
            .map((v) => {
              const attrs = v.atributos || {};
              return attrs.color || attrs.Color || attrs.COLOR || null;
            })
            .filter(Boolean)
        )
      )
    : coloresDisponibles;

  // Calcular precios (igual que en productos_catalogo)
  // Si hay variante seleccionada, usar su precio (las variantes no tienen descuento)
  // Si no hay variante, calcular desde el producto con descuento
  const precios = useMemo(() => {
    let final = 0;
    let original = 0;
    
    if (!producto) {
      return { precioFinal: 0, precioOriginal: 0 };
    }
    
    // Determinar el precio base: usar precio de variante si existe, sino usar precio del producto
    const precioBase = varianteSeleccionada && varianteSeleccionada.precio && varianteSeleccionada.precio > 0
      ? varianteSeleccionada.precio
      : producto.precio;
    
    // Aplicar descuento del producto al precio base (tanto para variantes como para el producto)
    if (producto.descuento > 0) {
      final = precioBase - (precioBase * producto.descuento / 100);
    } else {
      final = precioBase;
    }
    
    // Precio original: usar precio_original del producto si existe, sino usar precio base
    if (producto.precio_original && producto.precio_original !== producto.precio) {
      original = producto.precio_original;
    } else {
      original = precioBase;
    }
    
    return { precioFinal: final, precioOriginal: original };
  }, [producto, varianteSeleccionada]);
  
  const precioFinal = precios.precioFinal;
  const precioOriginal = precios.precioOriginal;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Producto no encontrado'}</p>
            <Link
              href="/tienda"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Usar imágenes de la BD o imagen principal como fallback
  const imagenesProducto = imagenes.length > 0 
    ? imagenes.map((img) => img.url)
    : producto.categoria?.imagen_url 
    ? [producto.categoria.imagen_url]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap gap-2 text-sm mb-8">
        <Link
          href="/"
          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
        >
          Inicio
        </Link>
        <span className="text-gray-400 dark:text-gray-500 font-medium">/</span>
        <Link
          href="/tienda"
          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
        >
          {producto.categoria?.nombre || 'Tienda'}
        </Link>
        <span className="text-gray-400 dark:text-gray-500 font-medium">/</span>
        <span className="text-gray-900 dark:text-white font-medium">{producto.nombre}</span>
      </div>

      <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${carrito.length > 0 ? 'lg:grid-cols-12' : 'lg:grid-cols-2'}`}>
        {/* Galería de Imágenes */}
        <div className={`${carrito.length > 0 ? 'lg:col-span-5' : ''} flex flex-col gap-4`}>
          {imagenesProducto.length > 0 ? (
            <>
              <div className="relative w-full aspect-square rounded-xl shadow-sm overflow-hidden bg-gray-100">
                <Image
                  src={imagenesProducto[imagenPrincipal]}
                  alt={producto.nombre}
                  fill
                  className="object-cover"
                />
              </div>
              {imagenesProducto.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {imagenesProducto.map((imagen, index) => (
                    <button
                      key={index}
                      onClick={() => setImagenPrincipal(index)}
                      className={`relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer transition-opacity ${
                        imagenPrincipal === index
                          ? 'opacity-100 border-2 border-blue-600'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image src={imagen} alt={`Vista ${index + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="relative w-full aspect-square rounded-xl shadow-sm overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">Sin imagen</span>
            </div>
          )}
        </div>

        {/* Información del Producto */}
        <div className={carrito.length > 0 ? 'lg:col-span-4' : ''}>
          <h1 className="text-gray-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight">
            {producto.nombre}
          </h1>

          {/* Descripción Corta */}
          {producto.descripcion_corta && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {producto.descripcion_corta}
            </p>
          )}

          {/* Calificación */}
          {producto.total_resenas > 0 && (
            <div className="mt-4 flex items-center">
              <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined !text-xl"
                    style={{
                      fontVariationSettings:
                        i < Math.round(producto.calificacion_promedio) ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
              <Link
                href="#reviews"
                className="ml-3 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {producto.total_resenas} Reseñas
              </Link>
            </div>
          )}

          {/* Precio */}
          <div className="mt-6 flex items-baseline gap-2 flex-wrap">
            <p className="text-base font-semibold text-gray-900 dark:text-white text-3xl">
              {formatPrice(precioFinal)}
            </p>
            {producto && producto.descuento > 0 && precioOriginal > precioFinal && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  {formatPrice(precioOriginal)}
                </p>
                <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 text-sm font-semibold px-2 py-1 rounded">
                  -{Math.round(producto.descuento)}%
                </span>
              </>
            )}
          </div>

          {/* Opciones */}
          <div className="mt-8 space-y-6">
            {/* Color - Solo mostrar si el producto tiene variantes con colores */}
            {producto.tiene_variantes && coloresDisponibles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Color</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {coloresDisponiblesPorTalla.map((color) => {
                    // Verificar si hay stock para este color
                    const tieneStock = variantes.some((v) => {
                      const attrs = v.atributos || {};
                      const vColor = attrs.color || attrs.Color || attrs.COLOR;
                      return vColor === color && v.stock > 0 && v.activo;
                    });

                    // Función para convertir nombre de color a código hex
                    const getColorHex = (colorName: string): string => {
                      const colorLower = colorName.toLowerCase().trim();
                      
                      // Colores básicos en español e inglés
                      const colorMap: Record<string, string> = {
                        // Español
                        'blanco': '#ffffff',
                        'negro': '#000000',
                        'gris': '#9ca3af',
                        'gris claro': '#d1d5db',
                        'gris oscuro': '#4b5563',
                        'rojo': '#ef4444',
                        'azul': '#3b82f6',
                        'verde': '#10b981',
                        'amarillo': '#fbbf24',
                        'naranja': '#f97316',
                        'rosa': '#ec4899',
                        'morado': '#a855f7',
                        'marrón': '#92400e',
                        'beige': '#f5f5dc',
                        'turquesa': '#14b8a6',
                        'coral': '#ff7f50',
                        'vino': '#7f1d1d',
                        'dorado': '#fbbf24',
                        'plateado': '#9ca3af',
                        // Inglés
                        'white': '#ffffff',
                        'black': '#000000',
                        'gray': '#9ca3af',
                        'grey': '#9ca3af',
                        'light gray': '#d1d5db',
                        'dark gray': '#4b5563',
                        'red': '#ef4444',
                        'blue': '#3b82f6',
                        'green': '#10b981',
                        'yellow': '#fbbf24',
                        'orange': '#f97316',
                        'pink': '#ec4899',
                        'purple': '#a855f7',
                        'brown': '#92400e',
                        'turquoise': '#14b8a6',
                        'wine': '#7f1d1d',
                        'gold': '#fbbf24',
                        'silver': '#9ca3af',
                      };

                      // Si está en el mapa, devolver el hex
                      if (colorMap[colorLower]) {
                        return colorMap[colorLower];
                      }

                      // Si es un código hex válido, devolverlo
                      if (/^#[0-9A-F]{6}$/i.test(colorName)) {
                        return colorName;
                      }

                      // Si es un color CSS válido, intentar usarlo directamente
                      // Crear un elemento temporal para verificar si es un color válido
                      const tempDiv = document.createElement('div');
                      tempDiv.style.color = colorName;
                      if (tempDiv.style.color !== '') {
                        return colorName;
                      }

                      // Por defecto, intentar usar el nombre como color (puede funcionar para algunos colores CSS)
                      return colorName;
                    };

                    const colorHex = getColorHex(color);

                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setColorSeleccionado(color);
                          // Si la talla actual no está disponible para este color, resetear talla
                          const tallasParaColor = Array.from(
                            new Set(
                              variantes
                                .filter((v) => {
                                  const attrs = v.atributos || {};
                                  const vColor = attrs.color || attrs.Color || attrs.COLOR;
                                  return vColor === color && v.stock > 0 && v.activo;
                                })
                                .map((v) => {
                                  const attrs = v.atributos || {};
                                  return attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE || null;
                                })
                                .filter(Boolean)
                            )
                          );
                          if (tallaSeleccionada && !tallasParaColor.includes(tallaSeleccionada)) {
                            setTallaSeleccionada(tallasParaColor[0] || null);
                          }
                        }}
                        disabled={!tieneStock}
                        className={`size-8 rounded-full border-2 transition-all ${
                          colorSeleccionado === color
                            ? 'border-blue-600 ring-2 ring-blue-600/30 ring-offset-2'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-500'
                        } ${!tieneStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          backgroundColor: colorHex,
                          ...(colorHex === '#ffffff' || colorHex.toLowerCase() === '#fff' || colorHex.toLowerCase() === 'white'
                            ? { borderColor: '#d1d5db' }
                            : {}),
                        }}
                        title={color + (tieneStock ? '' : ' - Sin stock')}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Talla - Solo mostrar si el producto tiene variantes con tallas */}
            {producto.tiene_variantes && tallasDisponibles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Talla</h3>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {tallasDisponiblesPorColor.map((talla) => {
                    // Verificar si hay stock para esta talla
                    const tieneStock = variantes.some((v) => {
                      const attrs = v.atributos || {};
                      const vTalla = attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE;
                      const vColor = attrs.color || attrs.Color || attrs.COLOR;
                      return (
                        vTalla === talla &&
                        (!colorSeleccionado || vColor === colorSeleccionado) &&
                        v.stock > 0 &&
                        v.activo
                      );
                    });

                    return (
                      <button
                        key={talla}
                        onClick={() => {
                          setTallaSeleccionada(talla);
                          // Si el color actual no está disponible para esta talla, resetear color
                          const coloresParaTalla = Array.from(
                            new Set(
                              variantes
                                .filter((v) => {
                                  const attrs = v.atributos || {};
                                  const vTalla = attrs.talla || attrs.Talla || attrs.TALLA || attrs.size || attrs.Size || attrs.SIZE;
                                  return vTalla === talla && v.stock > 0 && v.activo;
                                })
                                .map((v) => {
                                  const attrs = v.atributos || {};
                                  return attrs.color || attrs.Color || attrs.COLOR || null;
                                })
                                .filter(Boolean)
                            )
                          );
                          if (colorSeleccionado && !coloresParaTalla.includes(colorSeleccionado)) {
                            setColorSeleccionado(coloresParaTalla[0] || null);
                          }
                        }}
                        disabled={!tieneStock}
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          tallaSeleccionada === talla
                            ? 'border-blue-600 bg-blue-600/20 text-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                        } ${!tieneStock ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                        title={talla + (tieneStock ? '' : ' - Sin stock')}
                      >
                        {talla}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cantidad y Añadir al Carrito */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600">
                <button
                  onClick={decrementarCantidad}
                  className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <span className="material-symbols-outlined !text-xl">remove</span>
                </button>
                <input
                  type="text"
                  value={cantidad}
                  readOnly
                  className="w-12 text-center border-0 bg-transparent focus:ring-0 text-gray-800 dark:text-gray-200"
                />
                <button
                  onClick={incrementarCantidad}
                  disabled={botonIncrementarDeshabilitado}
                  className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined !text-xl">add</span>
                </button>
              </div>
              <button
                onClick={handleAgregarAlCarrito}
                disabled={agregando || stockDisponible === 0 || cantidad <= 0 || cantidad > stockDisponible}
                className="flex-1 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-blue-600 text-white gap-2 text-base font-bold hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {agregando ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    <span>Agregando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">shopping_cart</span>
                    <span>Añadir al carrito</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Botón Ver Carrito - Siempre visible */}
            <Link
              href="/carrito"
              className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              Ver carrito
            </Link>

            {mensajeExito && (
              <div className="mt-4">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <span className="material-symbols-outlined !text-lg">check_circle</span>
                  {mensajeExito}
                </p>
              </div>
            )}

            <p className={`text-sm flex items-center gap-2 ${
              stockDisponible > 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined !text-lg">
                {stockDisponible > 0 ? 'check_circle' : 'cancel'}
              </span>
              {stockDisponible > 0
                ? `En Stock (${stockDisponible} disponibles) - ${producto.tiempo_envio || 'Se envía en 24 horas'}`
                : 'Sin Stock'}
            </p>
            {varianteSeleccionada && varianteSeleccionada.sku && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                SKU: {varianteSeleccionada.sku}
              </p>
            )}
          </div>

          {/* Información del Producto */}
          <div className="mt-10 border-t border-gray-200 dark:border-gray-700">
            {/* Descripción - Siempre visible */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Descripción</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {producto.descripcion || producto.descripcion_corta || 'Sin descripción disponible.'}
              </p>
            </div>
            {especificaciones.length > 0 && (
              <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Especificaciones
                </h3>
                <ul className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed list-disc pl-5 space-y-1">
                  {especificaciones.map((spec) => (
                    <li key={spec.id}>
                      <strong>{spec.nombre}:</strong> {spec.valor || 'N/A'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Envíos y Devoluciones - Siempre visible */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Envíos y Devoluciones
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                Envío estándar gratuito en pedidos superiores a $50. Aceptamos devoluciones dentro
                de los 30 días posteriores a la entrega para un reembolso completo. Los artículos
                deben estar en su estado original.
              </p>
            </div>
          </div>
        </div>

        {/* Mini Carrito Lateral - Solo visible cuando hay productos */}
        {carrito.length > 0 && (
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Tu Carrito
              </h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'}
              </p>
                
                <div className="space-y-4 mb-6">
                  {carrito.map((item) => (
                    <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        {item.imagen ? (
                          <Image
                            src={item.imagen}
                            alt={item.producto_nombre || 'Producto'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined">image</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {item.producto_nombre || 'Producto'}
                        </h3>
                        
                        {(item.color || item.talla) && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {item.color && `Color: ${item.color}`}
                            {item.color && item.talla && ', '}
                            {item.talla && `Talla: ${item.talla}`}
                          </p>
                        )}
                        
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                          {formatPrice(item.precio_unitario * item.cantidad)}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                            <button
                              onClick={() => handleActualizarCantidad(item.id, item.cantidad - 1)}
                              disabled={item.cantidad <= 1}
                              className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined !text-sm">remove</span>
                            </button>
                            <span className="px-2 text-sm text-gray-800 dark:text-gray-200 min-w-[20px] text-center">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => handleActualizarCantidad(item.id, item.cantidad + 1)}
                              disabled={item.cantidad >= calcularStockMaximo(item)}
                              className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined !text-sm">add</span>
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleEliminarDelCarrito(item.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined !text-sm">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <Link
                    href="/carrito"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                  >
                    INICIAR PEDIDO
                  </Link>
                  <Link
                    href="/tienda"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors"
                  >
                    SEGUIR COMPRANDO
                  </Link>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Productos Relacionados */}
      {productosRelacionados.length > 0 && (
        <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              También te podría gustar
            </h2>
            <div className="flex items-center gap-2">
              <button className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {productosRelacionados.map((prod) => (
              <div key={prod.id} className="flex flex-col group">
                <Link href={`/producto/${prod.id}`} className="block overflow-hidden rounded-xl shadow-sm">
                  <div className="relative w-full aspect-square">
                    {prod.imagen_principal ? (
                      <Image
                        src={prod.imagen_principal}
                        alt={prod.nombre}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400">Sin imagen</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="mt-4">
                  <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-base leading-snug line-clamp-2">
                    <Link href={`/producto/${prod.id}`} className="hover:text-blue-600">
                      {prod.nombre}
                    </Link>
                  </h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-gray-900 dark:text-white font-bold">
                      {formatPrice(prod.precio_final)}
                    </p>
                    {prod.precio_original && prod.precio_original > prod.precio_final && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm line-through">
                        {formatPrice(prod.precio_original)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Beneficios */}
      <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Envío Gratis
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                En todos los pedidos superiores a $50. Enviamos a cualquier parte del país.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Materiales Sostenibles
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Elaborado con materiales ecológicos para un planeta mejor.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
                <span className="material-symbols-outlined">headset_mic</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Soporte 24/7
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Nuestro equipo está aquí para ayudarte con cualquier pregunta o inquietud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
