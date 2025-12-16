// Este archivo contiene todas las funciones de queries a la base de datos
// IMPORTANTE: Este archivo debe ser copiado completo desde el proyecto original
// ya que tiene más de 1000 líneas y es esencial para el funcionamiento

import { supabase } from './supabase';
import type {
  Producto,
  ProductoCatalogo,
  ProductoImagen,
  ProductoVariante,
  ProductoEspecificacion,
  Pedido,
  Cliente,
  Categoria,
  QueryResult,
  Carrito,
  CarritoCompleto,
  MetodoPago,
  MetodoEnvio,
  CiudadEnvio,
  DisenoPagina,
} from '@/types/database';

// ============================================
// FUNCIONES DE PRODUCTOS
// ============================================

export async function getProductos(): Promise<QueryResult<Producto[]>> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(*)')
    .order('created_at', { ascending: false });
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getProductoById(id: string): Promise<QueryResult<Producto>> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(*)')
    .eq('id', id)
    .single();
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getProductosCatalogo(filters?: {
  categoria_id?: string;
  tipo_producto?: string;
  estado?: 'Activo';
  es_nuevo?: boolean;
  es_best_seller?: boolean;
  es_oferta?: boolean;
}): Promise<QueryResult<ProductoCatalogo[]>> {
  let query = supabase
    .from('productos_catalogo')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id);
  }
  if (filters?.tipo_producto) {
    query = query.eq('tipo_producto', filters.tipo_producto);
  }
  if (filters?.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters?.es_nuevo !== undefined) {
    query = query.eq('es_nuevo', filters.es_nuevo);
  }
  if (filters?.es_best_seller !== undefined) {
    query = query.eq('es_best_seller', filters.es_best_seller);
  }
  if (filters?.es_oferta !== undefined) {
    query = query.eq('es_oferta', filters.es_oferta);
  }

  const { data, error } = await query;
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función mejorada para obtener productos con filtros avanzados
export async function getProductosConFiltros(filters?: {
  categoria_id?: string;
  tipo_producto?: string[];
  precio_min?: number;
  precio_max?: number;
  estado?: 'Activo';
  sortBy?: 'precio-menor' | 'precio-mayor' | 'novedades' | 'popularidad';
  es_best_seller?: boolean;
  busqueda?: string;
  limit?: number;
  offset?: number;
}): Promise<QueryResult<ProductoCatalogo[]>> {
  let query = supabase
    .from('productos_catalogo')
    .select('*')
    .eq('estado', filters?.estado || 'Activo');

  // Filtro por búsqueda (nombre, descripción o SKU)
  if (filters?.busqueda && filters.busqueda.trim()) {
    const searchTerm = `%${filters.busqueda.trim()}%`;
    // Buscar en nombre, descripción o SKU usando OR
    // Sintaxis de Supabase PostgREST: campo.operador.valor,campo2.operador.valor2
    query = query.or(`nombre.ilike.${searchTerm},descripcion_corta.ilike.${searchTerm},sku.ilike.${searchTerm}`);
  }

  // Filtro por categoría
  if (filters?.categoria_id) {
    query = query.eq('categoria_id', filters.categoria_id);
  }

  // Filtro por tipo de producto (múltiples)
  if (filters?.tipo_producto && filters.tipo_producto.length > 0) {
    query = query.in('tipo_producto', filters.tipo_producto);
  }

  // Filtro por rango de precio
  if (filters?.precio_min !== undefined) {
    query = query.gte('precio_final', filters.precio_min);
  }
  if (filters?.precio_max !== undefined) {
    query = query.lte('precio_final', filters.precio_max);
  }

  // Filtro por best seller
  if (filters?.es_best_seller !== undefined) {
    query = query.eq('es_best_seller', filters.es_best_seller);
  }

  // Ordenamiento
  // Nota: Para "popularidad" y "novedades", necesitamos ordenar en el cliente
  // porque necesitamos múltiples criterios de ordenamiento
  const needsClientSorting = filters?.sortBy === 'popularidad' || filters?.sortBy === 'novedades';

  if (!needsClientSorting) {
    // Ordenamiento simple en la BD
    switch (filters?.sortBy) {
      case 'precio-menor':
        query = query.order('precio_final', { ascending: true });
        break;
      case 'precio-mayor':
        query = query.order('precio_final', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }
  } else {
    // Para ordenamientos complejos, obtener todos y ordenar en el cliente
    query = query.order('created_at', { ascending: false });
  }

  // Paginación - solo si no necesitamos ordenamiento en cliente
  if (!needsClientSorting) {
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset !== undefined && filters?.limit) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1);
    }
  }

  const { data, error } = await query;
  
  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  let sortedData = data || [];

  // Ordenamiento en el cliente para casos complejos
  if (needsClientSorting && sortedData.length > 0) {
    if (filters?.sortBy === 'popularidad') {
      // Ordenar: best sellers primero, luego por calificación
      sortedData = sortedData.sort((a, b) => {
        // Primero ordenar por es_best_seller (true primero)
        if (a.es_best_seller !== b.es_best_seller) {
          return b.es_best_seller ? 1 : -1;
        }
        // Luego por calificación (mayor primero)
        const califA = a.calificacion_promedio || 0;
        const califB = b.calificacion_promedio || 0;
        return califB - califA;
      });
    } else if (filters?.sortBy === 'novedades') {
      // Ordenar: nuevos primero, luego por fecha de creación
      sortedData = sortedData.sort((a, b) => {
        // Primero ordenar por es_nuevo (true primero)
        if (a.es_nuevo !== b.es_nuevo) {
          return b.es_nuevo ? 1 : -1;
        }
        // Luego por fecha de creación (más reciente primero)
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    }

    // Aplicar paginación después del ordenamiento
    if (filters?.limit) {
      const offset = filters?.offset || 0;
      sortedData = sortedData.slice(offset, offset + filters.limit);
    }
  }
  
  return {
    data: sortedData,
    error: null,
  };
}

// Función para obtener tipos de productos únicos
export async function getTiposProductos(): Promise<QueryResult<string[]>> {
  const { data, error } = await supabase
    .from('productos_catalogo')
    .select('tipo_producto')
    .eq('estado', 'Activo')
    .not('tipo_producto', 'is', null);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const tiposUnicos = [...new Set(data.map((item) => item.tipo_producto).filter(Boolean))] as string[];
  
  return {
    data: tiposUnicos,
    error: null,
  };
}

// Función para obtener imágenes de un producto
export async function getProductoImagenes(productoId: string): Promise<QueryResult<ProductoImagen[]>> {
  const { data, error } = await supabase
    .from('producto_imagenes')
    .select('*')
    .eq('producto_id', productoId)
    .order('orden', { ascending: true });

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener especificaciones de un producto
export async function getProductoEspecificaciones(productoId: string): Promise<QueryResult<ProductoEspecificacion[]>> {
  const { data, error } = await supabase
    .from('producto_especificaciones')
    .select('*')
    .eq('producto_id', productoId)
    .order('created_at', { ascending: true });

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener variantes de un producto
export async function getProductoVariantes(productoId: string): Promise<QueryResult<ProductoVariante[]>> {
  const { data, error } = await supabase
    .from('producto_variantes')
    .select('*')
    .eq('producto_id', productoId)
    .eq('activo', true)
    .order('created_at', { ascending: true });

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener productos relacionados (misma categoría o tipo)
export async function getProductosRelacionados(
  productoId: string,
  categoriaId?: string | null,
  tipoProducto?: string | null,
  limit: number = 4
): Promise<QueryResult<ProductoCatalogo[]>> {
  let query = supabase
    .from('productos_catalogo')
    .select('*')
    .eq('estado', 'Activo')
    .neq('id', productoId)
    .limit(limit);

  // Priorizar productos de la misma categoría
  if (categoriaId) {
    query = query.eq('categoria_id', categoriaId);
  } else if (tipoProducto) {
    // Si no hay categoría, usar tipo de producto
    query = query.eq('tipo_producto', tipoProducto);
  }

  const { data, error } = await query;

  // Si no hay suficientes productos con los filtros, obtener más sin filtros
  if (!error && data && data.length < limit) {
    const { data: moreData } = await supabase
      .from('productos_catalogo')
      .select('*')
      .eq('estado', 'Activo')
      .neq('id', productoId)
      .limit(limit - data.length);

    if (moreData) {
      // Combinar sin duplicados
      const existingIds = new Set(data.map((p) => p.id));
      const additional = moreData.filter((p) => !existingIds.has(p.id));
      data.push(...additional);
    }
  }

  return {
    data: error ? null : (data || []).slice(0, limit),
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE CATEGORÍAS
// ============================================

export async function getCategorias(): Promise<QueryResult<Categoria[]>> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('estado', 'Activo')
    .order('orden', { ascending: true });
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE PEDIDOS
// ============================================

export async function getPedidos(filters?: {
  cliente_id?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}): Promise<QueryResult<Pedido[]>> {
  let query = supabase
    .from('pedidos')
    .select('*, cliente:clientes(*)')
    .order('fecha_pedido', { ascending: false });

  if (filters?.cliente_id) {
    query = query.eq('cliente_id', filters.cliente_id);
  }
  if (filters?.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getPedidoById(id: string): Promise<QueryResult<Pedido>> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, cliente:clientes(*), items:pedido_items(*, producto:productos(*))')
    .eq('id', id)
    .single();
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getPedidoByNumero(numeroPedido: string): Promise<QueryResult<Pedido>> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, cliente:clientes(*), items:pedido_items(*, producto:productos(*))')
    .eq('numero_pedido', numeroPedido)
    .single();
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE CLIENTES
// ============================================

// Función para obtener datos del cliente por user_id
export async function getClienteByUserId(userId: string): Promise<QueryResult<Cliente>> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No se encontró cliente, retornar null
      return { data: null, error: null };
    }
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data || null,
    error: null,
  };
}

export async function getClientes(filters?: {
  limit?: number;
  offset?: number;
}): Promise<QueryResult<Cliente[]>> {
  let query = supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE CARRITO
// ============================================

export async function getCarrito(cliente_id?: string, session_id?: string): Promise<QueryResult<CarritoCompleto[]>> {
  let query = supabase
    .from('carrito_completo')
    .select(`
      *,
      producto:productos(descuento, precio_original, precio)
    `)
    .order('created_at', { ascending: false });

  if (cliente_id) {
    query = query.eq('cliente_id', cliente_id);
  } else if (session_id) {
    query = query.eq('session_id', session_id);
  }

  const { data, error } = await query;
  
  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  // Mapear los datos para incluir descuento y precio_original del producto
  const carritoConDescuento = (data || []).map((item) => {
    const itemWithProduct = item as CarritoCompleto & { producto?: Array<{ descuento?: number; precio_original?: number | null; precio?: number }> };
    const producto = Array.isArray(itemWithProduct.producto) ? itemWithProduct.producto[0] : itemWithProduct.producto;
    
    return {
      ...item as CarritoCompleto,
      producto_descuento: producto?.descuento || 0,
      producto_precio_original: producto?.precio_original || producto?.precio || null,
      producto_precio: producto?.precio || 0,
    };
  });

  return {
    data: carritoConDescuento,
    error: null,
  };
}

// Función para actualizar cantidad de un item del carrito
export async function actualizarCantidadCarrito(
  carritoId: string,
  cantidad: number
): Promise<QueryResult<Carrito>> {
  const { data, error } = await supabase
    .from('carrito')
    .update({ cantidad, updated_at: new Date().toISOString() })
    .eq('id', carritoId)
    .select()
    .single();

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para eliminar un item del carrito
export async function eliminarItemCarrito(carritoId: string): Promise<QueryResult<void>> {
  const { error } = await supabase.from('carrito').delete().eq('id', carritoId);

  return {
    data: error ? null : undefined,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener o crear session_id
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const SESSION_EXPIRY_HOURS = 24; // El carrito expira después de 24 horas
  const SESSION_KEY = 'cart_session_id';
  const SESSION_TIMESTAMP_KEY = 'cart_session_timestamp';
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  const sessionTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
  
  // Verificar si el session_id existe y no ha expirado
  if (sessionId && sessionTimestamp) {
    const timestamp = parseInt(sessionTimestamp, 10);
    const now = Date.now();
    const hoursSinceCreation = (now - timestamp) / (1000 * 60 * 60);
    
    // Si la sesión no ha expirado, retornar el session_id existente
    if (hoursSinceCreation < SESSION_EXPIRY_HOURS) {
      return sessionId;
    }
    
    // Si la sesión expiró, limpiar el carrito del session_id anterior
    limpiarCarrito(undefined, sessionId).catch((err) => {
      console.error('Error limpiando carrito expirado:', err);
    });
  }
  
  // Crear nuevo session_id
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
  
  return sessionId;
}

// Función para limpiar el session_id actual (cuando el usuario cierra sesión o sale)
export function clearSessionId(): void {
  if (typeof window === 'undefined') return;
  
  const sessionId = localStorage.getItem('cart_session_id');
  if (sessionId) {
    // Limpiar el carrito antes de eliminar el session_id
    limpiarCarrito(undefined, sessionId).catch((err) => {
      console.error('Error limpiando carrito al cerrar sesión:', err);
    });
  }
  
  localStorage.removeItem('cart_session_id');
  localStorage.removeItem('cart_session_timestamp');
}

// Función para agregar producto al carrito
export async function agregarAlCarrito(data: {
  producto_id: string;
  variante_id?: string | null;
  cantidad: number;
  precio_unitario: number;
  color?: string | null;
  talla?: string | null;
  cliente_id?: string | null;
  session_id?: string;
}): Promise<QueryResult<Carrito>> {
  // Si no hay cliente_id ni session_id, crear session_id
  const sessionId = data.session_id || (typeof window !== 'undefined' ? getSessionId() : '');

  // Verificar si ya existe el mismo producto+variante en el carrito
  let query = supabase
    .from('carrito')
    .select('*')
    .eq('producto_id', data.producto_id);

  if (data.variante_id) {
    query = query.eq('variante_id', data.variante_id);
  } else {
    query = query.is('variante_id', null);
  }

  if (data.cliente_id) {
    query = query.eq('cliente_id', data.cliente_id);
  } else {
    query = query.eq('session_id', sessionId).is('cliente_id', null);
  }

  const { data: existingItems, error: checkError } = await query;

  if (checkError) {
    return {
      data: null,
      error: new Error(checkError.message),
    };
  }

  const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;

  if (existingItem) {
    // Si ya existe, actualizar la cantidad
    const nuevaCantidad = existingItem.cantidad + data.cantidad;
    const { data: updated, error: updateError } = await supabase
      .from('carrito')
      .update({
        cantidad: nuevaCantidad,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingItem.id)
      .select()
      .single();

    return {
      data: updated,
      error: updateError ? new Error(updateError.message) : null,
    };
  } else {
    // Si no existe, crear nuevo item
    const { data: newItem, error: insertError } = await supabase
      .from('carrito')
      .insert({
        producto_id: data.producto_id,
        variante_id: data.variante_id || null,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario,
        color: data.color || null,
        talla: data.talla || null,
        cliente_id: data.cliente_id || null,
        session_id: sessionId,
      })
      .select()
      .single();

    return {
      data: newItem,
      error: insertError ? new Error(insertError.message) : null,
    };
  }
}

// Función para crear un pedido completo (pedido + items)
export async function crearPedido(data: {
  cliente_id?: string | null;
  nombre_cliente?: string;
  apellido_cliente?: string;
  telefono_cliente?: string;
  email_cliente?: string;
  subtotal: number;
  descuento?: number;
  costo_envio: number;
  envio_prioritario: boolean;
  total: number;
  metodo_pago: 'Efectivo' | 'Transferencia QR' | 'Tarjeta' | 'Otro';
  direccion_completa?: string;
  ciudad_envio?: string;
  referencias_envio?: string;
  departamento?: string;
  items: Array<{
    producto_id: string;
    variante_id?: string | null;
    nombre_producto: string;
    sku?: string | null;
    precio_unitario: number;
    cantidad: number;
    subtotal: number;
  }>;
}): Promise<QueryResult<Pedido>> {
  try {
    let clienteIdFinal = data.cliente_id || null;

    // Si no hay cliente_id (pedido sin autenticación), crear o actualizar cliente en la tabla clientes
    if (!clienteIdFinal && (data.email_cliente || data.telefono_cliente)) {
      try {
        // Buscar cliente existente por email o teléfono
        let clienteExistente: { id: string; email?: string | null; whatsapp?: string | null } | null = null;

        if (data.email_cliente) {
          const { data: clientePorEmail, error: errorEmail } = await supabase
            .from('clientes')
            .select('id, email, whatsapp')
            .eq('email', data.email_cliente)
            .maybeSingle();
          
          if (!errorEmail && clientePorEmail) {
            clienteExistente = clientePorEmail;
          }
        }

        // Si no se encontró por email, buscar por teléfono
        if (!clienteExistente && data.telefono_cliente) {
          const { data: clientePorTelefono, error: errorTelefono } = await supabase
            .from('clientes')
            .select('id, email, whatsapp')
            .eq('telefono', data.telefono_cliente)
            .maybeSingle();
          
          if (!errorTelefono && clientePorTelefono) {
            clienteExistente = clientePorTelefono;
          }
        }

        if (clienteExistente) {
          // Actualizar cliente existente
          clienteIdFinal = clienteExistente.id;
          
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          if (data.nombre_cliente) {
            const partesNombre = data.nombre_cliente.trim().split(' ');
            updateData.nombre = partesNombre[0] || data.nombre_cliente;
            if (partesNombre.length > 1) {
              updateData.apellido = partesNombre.slice(1).join(' ');
            }
          }

          if (data.apellido_cliente) {
            updateData.apellido = data.apellido_cliente;
          }

          if (data.email_cliente && !clienteExistente.email) {
            updateData.email = data.email_cliente;
          }

          if (data.telefono_cliente) {
            updateData.telefono = data.telefono_cliente;
            // Si no hay whatsapp, usar el teléfono
            if (!clienteExistente.whatsapp) {
              updateData.whatsapp = data.telefono_cliente;
            }
          }

          if (data.departamento) {
            updateData.departamento = data.departamento;
          }

          await supabase
            .from('clientes')
            .update(updateData)
            .eq('id', clienteIdFinal);
        } else {
          // Crear nuevo cliente
          const partesNombre = (data.nombre_cliente || '').trim().split(' ');
          const nombre = partesNombre[0] || 'Cliente';
          const apellido = partesNombre.length > 1 ? partesNombre.slice(1).join(' ') : (data.apellido_cliente || null);

          const { data: nuevoCliente, error: clienteError } = await supabase
            .from('clientes')
            .insert({
              nombre: nombre,
              apellido: apellido,
              email: data.email_cliente || null,
              telefono: data.telefono_cliente || null,
              whatsapp: data.telefono_cliente || null,
              departamento: data.departamento || null,
              tipo: 'Nuevo',
              user_id: null, // Sin autenticación
            })
            .select('id')
            .single();

          if (!clienteError && nuevoCliente) {
            clienteIdFinal = nuevoCliente.id;
          }
        }
      } catch (err) {
        // Si hay error al crear/actualizar cliente, continuar sin cliente_id
        // El pedido se creará con los datos en nombre_cliente, etc.
        console.error('Error creando/actualizando cliente:', err);
      }
    }

    // Crear el pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: clienteIdFinal,
        nombre_cliente: data.nombre_cliente || null,
        apellido_cliente: data.apellido_cliente || null,
        telefono_cliente: data.telefono_cliente || null,
        email_cliente: data.email_cliente || null,
        subtotal: data.subtotal,
        descuento: data.descuento || 0,
        costo_envio: data.costo_envio,
        envio_prioritario: data.envio_prioritario,
        total: data.total,
        metodo_pago: data.metodo_pago,
        direccion_completa: data.direccion_completa || null,
        ciudad_envio: data.ciudad_envio || null,
        referencias_envio: data.referencias_envio || null,
        estado: 'Pendiente',
        // El numero_pedido se genera automáticamente por el trigger
        numero_pedido: '', // Se generará automáticamente
      })
      .select()
      .single();

    if (pedidoError || !pedido) {
      return {
        data: null,
        error: new Error(pedidoError?.message || 'Error al crear el pedido'),
      };
    }

    // Crear los items del pedido
    const itemsData = data.items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      variante_id: item.variante_id || null,
      nombre_producto: item.nombre_producto,
      sku: item.sku || null,
      precio_unitario: item.precio_unitario,
      cantidad: item.cantidad,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('pedido_items')
      .insert(itemsData);

    if (itemsError) {
      // Si hay error al crear items, eliminar el pedido creado
      await supabase.from('pedidos').delete().eq('id', pedido.id);
      return {
        data: null,
        error: new Error(itemsError.message || 'Error al crear los items del pedido'),
      };
    }

    // Restar el stock de los productos y variantes
    for (const item of data.items) {
      if (item.variante_id) {
        // Si tiene variante, restar stock de la variante
        const { data: variante, error: varianteError } = await supabase
          .from('producto_variantes')
          .select('stock')
          .eq('id', item.variante_id)
          .single();

        if (!varianteError && variante) {
          const nuevoStock = Math.max(0, variante.stock - item.cantidad);
          await supabase
            .from('producto_variantes')
            .update({ stock: nuevoStock })
            .eq('id', item.variante_id);
        }
      } else {
        // Si no tiene variante, restar stock del producto
        const { data: producto, error: productoError } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single();

        if (!productoError && producto) {
          const nuevoStock = Math.max(0, producto.stock - item.cantidad);
          await supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', item.producto_id);
        }
      }
    }

    // Obtener el pedido completo con el número generado
    const { data: pedidoCompleto, error: fetchError } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedido.id)
      .single();

    if (fetchError || !pedidoCompleto) {
      return {
        data: pedido as Pedido,
        error: null,
      };
    }

    return {
      data: pedidoCompleto as Pedido,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error inesperado al crear el pedido';
    return {
      data: null,
      error: new Error(errorMessage),
    };
  }
}

// Función para limpiar el carrito después de crear un pedido
export async function limpiarCarrito(cliente_id?: string, session_id?: string): Promise<QueryResult<void>> {
  try {
    if (cliente_id) {
      // Limpiar carrito por cliente_id
      const { error } = await supabase
        .from('carrito')
        .delete()
        .eq('cliente_id', cliente_id);

      if (error) {
        return {
          data: undefined,
          error: new Error(error.message),
        };
      }
    } else if (session_id) {
      // Limpiar carrito por session_id
      const { error } = await supabase
        .from('carrito')
        .delete()
        .eq('session_id', session_id);

      if (error) {
        return {
          data: undefined,
          error: new Error(error.message),
        };
      }
    } else {
      return {
        data: undefined,
        error: new Error('Se requiere cliente_id o session_id para limpiar el carrito'),
      };
    }

    return {
      data: undefined,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error inesperado al limpiar el carrito';
    return {
      data: undefined,
      error: new Error(errorMessage),
    };
  }
}

// ============================================
// FUNCIONES DE MÉTODOS DE PAGO Y ENVÍO
// ============================================

export async function getMetodosPago(): Promise<QueryResult<MetodoPago[]>> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getMetodosEnvio(): Promise<QueryResult<MetodoEnvio[]>> {
  const { data, error } = await supabase
    .from('metodos_envio')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getCiudadesEnvio(): Promise<QueryResult<CiudadEnvio[]>> {
  const { data, error } = await supabase
    .from('ciudades_envio')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true });
  
  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE DISEÑO DE PÁGINA
// ============================================

export async function getDisenoPagina(
  seccion?: string
): Promise<QueryResult<DisenoPagina[]>> {
  let query = supabase
    .from('diseno_pagina')
    .select('*')
    .eq('visible', true)
    .order('orden', { ascending: true });

  if (seccion) {
    query = query.eq('seccion', seccion);
  }

  const { data, error } = await query;

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getDisenoPaginaBySeccion(
  seccion: string,
  tipo?: 'banner' | 'seccion'
): Promise<QueryResult<DisenoPagina>> {
  let query = supabase
    .from('diseno_pagina')
    .select('*')
    .eq('seccion', seccion)
    .eq('visible', true);

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  const { data, error } = await query.single();

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener todos los banners (tipo = 'banner')
export async function getBannersFromConfig(): Promise<QueryResult<Array<{
  id: string;
  titulo: string;
  subtitulo: string;
  textoBoton: string;
  urlBoton: string;
  imagen: string | null;
  orden: number;
}>>> {
  // Obtener datos siempre frescos (sin caché)
  const { data, error } = await supabase
    .from('diseno_pagina')
    .select('*')
    .eq('tipo', 'banner')
    .eq('visible', true)
    .order('orden', { ascending: true });
    
  if (error) {
    console.error('❌ Error en getBannersFromConfig:', error);
    return { data: [], error: new Error(error.message) };
  }

  if (!data || data.length === 0) {
    console.log('ℹ️ No hay banners en la base de datos');
    return { data: [], error: null };
  }

  // Log detallado de lo que viene de la BD
  console.log(`📊 Banners obtenidos de BD: ${data.length} registros`);
  data.forEach((item, index) => {
    console.log(`  Banner ${index + 1}:`, {
      id: item.id,
      seccion: item.seccion,
      tipo: item.tipo,
      visible: item.visible,
      orden: item.orden,
      titulo: item.configuracion?.titulo || 'Sin título',
    });
  });

  // Log para debug: ver qué viene de la BD
  const ids = data.map((item) => item.id);
  const uniqueIds = [...new Set(ids)];
  if (ids.length !== uniqueIds.length) {
    console.warn(`⚠️ Se encontraron ${ids.length} registros pero solo ${uniqueIds.length} IDs únicos. Hay duplicados en la BD.`);
    console.log('IDs duplicados:', ids.filter((id, index) => ids.indexOf(id) !== index));
  }

  // Mapear los banners desde la nueva estructura
  const bannersMap = new Map<string, {
    id: string;
    titulo: string;
    subtitulo: string;
    textoBoton: string;
    urlBoton: string;
    imagen: string | null;
    orden: number;
  }>();
  
  data.forEach((item) => {
    // Usar el ID como clave única para evitar duplicados
    if (!bannersMap.has(item.id)) {
      bannersMap.set(item.id, {
        id: item.id,
        titulo: item.configuracion?.titulo || '',
        subtitulo: item.configuracion?.subtitulo || '',
        textoBoton: item.configuracion?.textoBoton || 'Explorar',
        urlBoton: item.url_enlace || item.configuracion?.urlBoton || '/tienda',
        imagen: item.configuracion?.imagen || null,
        orden: item.orden,
      });
    } else {
      console.warn(`⚠️ Banner duplicado detectado (ID: ${item.id}). Se está omitiendo.`);
    }
  });

  // Convertir el Map a array y ordenar por orden
  const banners = Array.from(bannersMap.values()).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  
  console.log(`✅ Banners procesados: ${banners.length} únicos de ${data.length} registros`);
  console.log('📋 Banners finales:', banners.map(b => ({ id: b.id, titulo: b.titulo, orden: b.orden })));

  return {
    data: banners,
    error: null,
  };
}

// ============================================
// FUNCIONES DE PRODUCTOS DESTACADOS
// ============================================

export async function getProductosDestacados(
  limit: number = 5
): Promise<QueryResult<ProductoCatalogo[]>> {
  const { data, error } = await supabase
    .from('productos_catalogo')
    .select('*')
    .in('estado', ['Activo'])
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getProductosNuevos(
  limit: number = 5
): Promise<QueryResult<ProductoCatalogo[]>> {
  const { data, error } = await supabase
    .from('productos_catalogo')
    .select('*')
    .eq('es_nuevo', true)
    .eq('estado', 'Activo')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getProductosBestSeller(
  limit: number = 5
): Promise<QueryResult<ProductoCatalogo[]>> {
  const { data, error } = await supabase
    .from('productos_catalogo')
    .select('*')
    .eq('es_best_seller', true)
    .eq('estado', 'Activo')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

export async function getProductosOfertas(
  limit: number = 5
): Promise<QueryResult<ProductoCatalogo[]>> {
  const { data, error } = await supabase
    .from('productos_catalogo')
    .select('*')
    .eq('es_oferta', true)
    .eq('estado', 'Activo')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE CATEGORÍAS PARA HOME
// ============================================

export async function getCategoriasParaHome(
  limit: number = 4
): Promise<QueryResult<Categoria[]>> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('estado', 'Activo')
    .order('orden', { ascending: true })
    .limit(limit);

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener todas las categorías activas con sus imágenes
export async function getCategoriasConImagenes(): Promise<QueryResult<Categoria[]>> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('estado', 'Activo')
    .order('orden', { ascending: true });

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para obtener categorías seleccionadas desde la configuración del diseño
export async function getCategoriasSeleccionadasHome(): Promise<QueryResult<Categoria[]>> {
  try {
    // Obtener la configuración de categorías desde diseno_pagina
    const configResult = await getDisenoPaginaBySeccion('categorias', 'seccion');
    
    if (configResult.error || !configResult.data) {
      // Si no hay configuración, retornar categorías por defecto
      return await getCategoriasParaHome(4);
    }

    const config = configResult.data.configuracion;
    
    // Verificar si hay categorías seleccionadas en la configuración
    if (!config?.categorias || !Array.isArray(config.categorias) || config.categorias.length === 0) {
      // Si no hay categorías seleccionadas, retornar categorías por defecto
      return await getCategoriasParaHome(4);
    }

    // Obtener los IDs de las categorías seleccionadas
    const categoriaIds = config.categorias
      .map((cat: { categoriaId?: string }) => cat.categoriaId)
      .filter((id): id is string => Boolean(id));

    if (categoriaIds.length === 0) {
      return await getCategoriasParaHome(4);
    }

    // Obtener los datos completos de las categorías seleccionadas
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias')
      .select('*')
      .in('id', categoriaIds)
      .eq('estado', 'Activo');

    if (categoriasError) {
      return {
        data: null,
        error: new Error(categoriasError.message),
      };
    }

    // Ordenar según el orden en la configuración
    const categoriasOrdenadas = categoriaIds
      .map((id: string) => categoriasData?.find((cat) => cat.id === id))
      .filter((cat) => cat !== undefined) as Categoria[];

    // Si hay imágenes en la configuración, usarlas; sino usar imagen_url de la BD
    const categoriasConImagenes = categoriasOrdenadas.map((categoria) => {
      const categoriaConfig = config.categorias.find(
        (cat: { categoriaId?: string; imagen?: string }) => cat.categoriaId === categoria.id
      );
      
      return {
        ...categoria,
        imagen_url: categoriaConfig?.imagen || categoria.imagen_url || null,
      };
    });

    return {
      data: categoriasConImagenes,
      error: null,
    };
  } catch (err) {
    console.error('Error obteniendo categorías seleccionadas:', err);
    // En caso de error, retornar categorías por defecto
    return await getCategoriasParaHome(4);
  }
}

// ============================================
// FUNCIONES DE CONFIGURACIÓN DE TIENDA
// ============================================

// Función para obtener la configuración de la tienda
export async function getConfiguracionTienda(clave: string = 'general'): Promise<QueryResult<{
  id: string;
  clave: string;
  valor: Record<string, unknown>;
  descripcion: string | null;
  updated_at: string;
}>> {
  const { data, error } = await supabase
    .from('tienda_configuracion')
    .select('*')
    .eq('clave', clave)
    .single();

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// Función para actualizar la configuración de la tienda
export async function actualizarConfiguracionTienda(
  clave: string,
  valor: Record<string, unknown>
): Promise<QueryResult<{
  id: string;
  clave: string;
  valor: Record<string, unknown>;
  descripcion: string | null;
  updated_at: string;
}>> {
  const { data, error } = await supabase
    .from('tienda_configuracion')
    .upsert({
      clave,
      valor,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return {
    data: error ? null : data,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================
// FUNCIONES DE DASHBOARD
// ============================================

// TODO: Agregar todas las demás funciones de queries del proyecto original aquí
// - crearProducto, actualizarProducto, eliminarProducto
// - crearPedido, actualizarPedido
// - crearCliente, actualizarCliente
// - getDashboardKPIs, getUltimosPedidos, getProductosMasVendidos
// - getVentasPorDia, getVentasPorCategoria
// - Y muchas más funciones críticas

