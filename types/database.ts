// Tipos de base de datos para Supabase
// Estos tipos coinciden con el esquema real en supabase_schema.sql

export interface Categoria {
  id: string; // UUID
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  imagen_url: string | null; // URL de imagen para homepage
  banner_imagen_url: string | null; // URL de imagen del banner de categoría
  banner_titulo: string | null; // Título del banner de categoría
  banner_descripcion: string | null; // Descripción del banner de categoría
  orden: number;
  estado: 'Activo' | 'Inactivo';
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string; // UUID
  sku: string;
  nombre: string;
  descripcion: string | null;
  descripcion_corta: string | null;
  precio: number;
  descuento: number;
  precio_original: number | null;
  stock: number;
  categoria_id: string | null; // UUID
  tipo_producto: string | null;
  estado: 'Borrador' | 'Activo' | 'Inactivo';
  tiene_variantes: boolean;
  es_nuevo: boolean;
  es_best_seller: boolean;
  es_oferta: boolean;
  etiqueta_personalizada: string | null;
  tiempo_envio: string;
  calificacion_promedio: number;
  total_resenas: number;
  created_at: string;
  updated_at: string;
  categoria?: Categoria;
}

export interface ProductoImagen {
  id: string; // UUID
  producto_id: string; // UUID
  url: string;
  orden: number;
  es_principal: boolean;
  created_at: string;
}

export interface ProductoVariante {
  id: string; // UUID
  producto_id: string; // UUID
  atributos: Record<string, any>; // JSONB
  precio: number | null;
  sku: string | null;
  stock: number;
  activo: boolean;
  imagen_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductoEspecificacion {
  id: string; // UUID
  producto_id: string; // UUID
  nombre: string;
  valor: string | null;
  created_at: string;
}

export interface ProductoCatalogo {
  id: string; // UUID
  sku: string;
  nombre: string;
  descripcion_corta: string | null;
  precio: number;
  descuento: number;
  precio_original: number | null;
  precio_final: number;
  stock: number;
  categoria_id: string | null; // UUID
  categoria_nombre: string | null;
  tipo_producto: string | null;
  es_nuevo: boolean;
  es_best_seller: boolean;
  es_oferta: boolean;
  etiqueta_personalizada: string | null;
  tiempo_envio: string;
  calificacion_promedio: number;
  total_resenas: number;
  imagen_principal: string | null;
  estado_stock: 'Sin Stock' | 'Bajo Stock' | 'En Stock';
  estado: 'Borrador' | 'Activo' | 'Inactivo';
  created_at: string;
}

export interface Cliente {
  id: string; // UUID
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  departamento: string | null; // Departamento de Bolivia donde reside el cliente
  tipo: 'Nuevo' | 'Recurrente' | 'VIP';
  fecha_registro: string;
  total_pedidos: number;
  total_gastado: number;
  user_id: string | null; // UUID de Supabase Auth
  created_at: string;
  updated_at: string;
}

export interface ClienteDireccion {
  id: string; // UUID
  cliente_id: string; // UUID
  tipo: 'envio' | 'facturacion';
  calle: string;
  ciudad: string | null;
  codigo_postal: string | null;
  pais: string;
  referencias: string | null;
  es_principal: boolean;
  created_at: string;
}

export interface Pedido {
  id: string; // UUID
  numero_pedido: string;
  cliente_id: string | null; // UUID
  nombre_cliente: string | null;
  apellido_cliente: string | null;
  telefono_cliente: string | null;
  email_cliente: string | null;
  estado: 'Pendiente' | 'Procesando' | 'Enviado' | 'Completado' | 'Cancelado';
  subtotal: number;
  descuento: number;
  costo_envio: number;
  envio_prioritario: boolean;
  total: number;
  metodo_pago: 'Efectivo' | 'Transferencia QR' | 'Tarjeta' | 'Otro' | null;
  metodo_envio: string | null;
  direccion_envio_id: string | null; // UUID
  direccion_facturacion_id: string | null; // UUID
  direccion_completa: string | null;
  ciudad_envio: string | null;
  referencias_envio: string | null;
  whatsapp_enviado: boolean;
  fecha_pedido: string;
  fecha_entrega: string | null;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
}

export interface PedidoItem {
  id: string; // UUID
  pedido_id: string; // UUID
  producto_id: string | null; // UUID
  variante_id: string | null; // UUID
  nombre_producto: string;
  sku: string | null;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  created_at: string;
  producto?: Producto;
}

export interface PedidoHistorial {
  id: string; // UUID
  pedido_id: string; // UUID
  estado: string;
  descripcion: string | null;
  fecha: string;
  completado: boolean;
}

export interface Carrito {
  id: string; // UUID
  cliente_id: string | null; // UUID
  session_id: string | null;
  producto_id: string; // UUID
  variante_id: string | null; // UUID
  cantidad: number;
  precio_unitario: number;
  color: string | null;
  talla: string | null;
  created_at: string;
  updated_at: string;
  producto?: Producto;
}

export interface ProductoResena {
  id: string; // UUID
  producto_id: string; // UUID
  cliente_id: string | null; // UUID
  nombre_cliente: string | null;
  email_cliente: string | null;
  calificacion: number; // 1-5
  titulo: string | null;
  comentario: string | null;
  verificada: boolean;
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada';
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string; // UUID
  cliente_id: string | null; // UUID
  session_id: string | null;
  producto_id: string; // UUID
  created_at: string;
}

export interface NewsletterSuscripcion {
  id: string; // UUID
  email: string;
  nombre: string | null;
  activo: boolean;
  fecha_suscripcion: string;
  fecha_baja: string | null;
  token_confirmacion: string | null;
  confirmado: boolean;
}

export interface SesionUsuario {
  id: string; // UUID
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity: string;
  expires_at: string | null;
}

export interface MetodoPago {
  id: string; // UUID
  nombre: string;
  codigo: string;
  descripcion: string | null;
  activo: boolean;
  icono: string | null;
  orden: number;
  created_at: string;
}

export interface MetodoEnvio {
  id: string; // UUID
  nombre: string;
  codigo: string;
  descripcion: string | null;
  costo: number;
  costo_gratis_desde: number | null;
  tiempo_estimado: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
}

export interface CiudadEnvio {
  id: string; // UUID
  nombre: string;
  codigo_postal: string | null;
  pais: string;
  activo: boolean;
  costo_envio_adicional: number;
  created_at: string;
}

export interface UsuarioAdmin {
  id: string; // UUID
  email: string;
  nombre: string | null;
  rol: 'admin' | 'editor' | 'viewer';
  activo: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisenoPagina {
  id: string; // UUID
  seccion: string; // 'banner_1', 'banner_2', 'novedades', 'categorias', etc.
  tipo: 'banner' | 'seccion'; // Tipo de elemento
  configuracion: Record<string, any>; // JSONB
  url_enlace?: string | null; // URL para botones de banners
  visible: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface ReporteMetrica {
  id: string; // UUID
  fecha: string;
  ventas_totales: number;
  total_pedidos: number;
  tasa_conversion: number;
  valor_promedio_pedido: number;
  visitantes_unicos: number;
  created_at: string;
}

export interface ProductoRelacionado {
  id: string; // UUID
  producto_id: string; // UUID
  producto_relacionado_id: string; // UUID
  tipo: string;
  orden: number;
  created_at: string;
}

export interface Busqueda {
  id: string; // UUID
  termino_busqueda: string;
  session_id: string | null;
  cliente_id: string | null; // UUID
  resultados_encontrados: number;
  categoria_filtrada: string | null; // UUID
  created_at: string;
}

export interface TiendaConfiguracion {
  id: string; // UUID
  clave: string;
  valor: Record<string, any>; // JSONB
  descripcion: string | null;
  updated_at: string;
}

// Tipos para Dashboard
export interface DashboardKPI {
  ventas_hoy: number;
  ventas_mes: number;
  pedidos_hoy: number;
  pedidos_mes: number;
  visitantes_hoy: number;
  visitantes_mes: number;
  tasa_conversion: number;
}

export interface VentasPorDia {
  fecha: string;
  total: number;
  cantidad_pedidos: number;
}

export interface VentasPorCategoria {
  categoria_id: string; // UUID
  categoria_nombre: string;
  total: number;
  cantidad_pedidos: number;
}

export interface ProductoMasVendido {
  producto_id: string; // UUID
  producto_nombre: string;
  cantidad_vendida: number;
  total_ingresos: number;
  imagen_principal: string | null;
}

export interface ProductoBajoStock {
  producto_id: string; // UUID
  producto_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  imagen_principal: string | null;
}

// Tipos de respuesta de queries
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

// Tipos para vistas
export interface ProductoCompleto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  descuento: number;
  stock: number;
  categoria_id: string | null;
  categoria_nombre: string | null;
  tipo_producto: string | null;
  estado: string;
  tiene_variantes: boolean;
  estado_stock: string;
  imagen_principal: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoCompleto {
  id: string;
  numero_pedido: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  estado: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: string | null;
  metodo_envio: string | null;
  fecha_pedido: string;
  fecha_entrega: string | null;
  total_items: number;
  created_at: string;
  updated_at: string;
}

export interface CarritoCompleto {
  id: string;
  cliente_id: string | null;
  session_id: string | null;
  producto_id: string;
  variante_id: string | null;
  producto_nombre: string;
  producto_sku: string;
  variante_atributos: Record<string, any> | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen: string | null;
  color: string | null;
  talla: string | null;
  created_at: string;
  updated_at: string;
  producto_descuento?: number;
  producto_precio_original?: number | null;
  producto_precio?: number;
}
