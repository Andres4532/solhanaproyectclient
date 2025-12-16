'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  getCarrito,
  actualizarCantidadCarrito,
  eliminarItemCarrito,
  getCiudadesEnvio,
  getMetodosPago,
  getSessionId,
  getClienteByUserId,
  crearPedido,
  limpiarCarrito,
  clearSessionId,
} from '@/lib/supabase-queries';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, getUser, signOut } from '@/lib/auth-helpers';
import type { CarritoCompleto, CiudadEnvio, MetodoPago } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CarritoPage() {
  const router = useRouter();
  const [carrito, setCarrito] = useState<CarritoCompleto[]>([]);
  const [ciudades, setCiudades] = useState<CiudadEnvio[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    ciudad: '',
    direccion: '',
  });
  const [envioPrioritario, setEnvioPrioritario] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'signup'>('login');
  const [emailForm, setEmailForm] = useState({ email: '', password: '', nombre: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { nombre?: string; full_name?: string } } | null>(null);

  // Cargar usuario autenticado y datos del cliente
  useEffect(() => {
    async function loadUser() {
      const { user: currentUser } = await getUser();
      setUser(currentUser);
      
      // Si hay usuario autenticado, cargar datos del cliente y autocompletar formulario
      if (currentUser?.id) {
        try {
          const clienteResult = await getClienteByUserId(currentUser.id);
          if (clienteResult.data) {
            const cliente = clienteResult.data;
            // Autocompletar formulario con datos del cliente
            setFormData((prev) => ({
              ...prev,
              nombre: cliente.nombre + (cliente.apellido ? ` ${cliente.apellido}` : '') || prev.nombre,
              telefono: cliente.telefono || cliente.whatsapp || prev.telefono,
            }));
          } else {
            // Si no hay cliente en la BD, intentar usar datos del user metadata
            const nombreCompleto = 
              currentUser.user_metadata?.nombre ||
              currentUser.user_metadata?.full_name ||
              currentUser.email?.split('@')[0] ||
              '';
            
            if (nombreCompleto) {
              setFormData((prev) => ({
                ...prev,
                nombre: nombreCompleto || prev.nombre,
              }));
            }
          }
        } catch (err) {
          console.error('Error cargando datos del cliente:', err);
          // Si hay error, intentar usar datos del user metadata
          const nombreCompleto = 
            currentUser.user_metadata?.nombre ||
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split('@')[0] ||
            '';
          
          if (nombreCompleto) {
            setFormData((prev) => ({
              ...prev,
              nombre: nombreCompleto || prev.nombre,
            }));
          }
        }
      }
    }
    loadUser();
    
    // Escuchar cambios de autenticación
    const handleAuthChange = async () => {
      const { user: currentUser } = await getUser();
      setUser(currentUser);
      
      // Si hay usuario autenticado, cargar datos del cliente
      if (currentUser?.id) {
        try {
          const clienteResult = await getClienteByUserId(currentUser.id);
          if (clienteResult.data) {
            const cliente = clienteResult.data;
            setFormData((prev) => ({
              ...prev,
              nombre: cliente.nombre + (cliente.apellido ? ` ${cliente.apellido}` : '') || prev.nombre,
              telefono: cliente.telefono || cliente.whatsapp || prev.telefono,
            }));
          }
        } catch (err) {
          console.error('Error cargando datos del cliente:', err);
        }
      }
    };
    
    window.addEventListener('auth-state-changed', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, []);

  // Cargar datos del carrito y ciudades
  useEffect(() => {
    async function loadCarritoData() {
      try {
        setLoading(true);
        setError(null);

        // Obtener session_id
        const sessionId = getSessionId();

        // Cargar carrito
        const carritoResult = await getCarrito(undefined, sessionId);
        if (carritoResult.error) {
          console.error('Error cargando carrito:', carritoResult.error);
          setCarrito([]);
        } else {
          setCarrito(carritoResult.data || []);
        }

        // Cargar ciudades
        const ciudadesResult = await getCiudadesEnvio();
        if (ciudadesResult.error) {
          console.error('Error cargando ciudades:', ciudadesResult.error);
        } else {
          setCiudades(ciudadesResult.data || []);
        }

        // Cargar métodos de pago
        const metodosPagoResult = await getMetodosPago();
        if (metodosPagoResult.error) {
          console.error('Error cargando métodos de pago:', metodosPagoResult.error);
        } else {
          const metodos = metodosPagoResult.data || [];
          setMetodosPago(metodos);
          // Establecer método de pago por defecto si hay métodos disponibles
          if (metodos.length > 0) {
            const metodoDefault = metodos.find((m) => m.codigo === 'efectivo') || metodos[0];
            if (metodoDefault) {
              setMetodoPago(metodoDefault.codigo);
            }
          }
        }
      } catch (err) {
        console.error('Error cargando datos del carrito:', err);
        setError('Error al cargar el carrito. Por favor, intenta más tarde.');
      } finally {
        setLoading(false);
      }
    }

    loadCarritoData();
  }, []);

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
  const envio = envioPrioritario ? 7 : 0;
  const total = subtotal + envio;

  // Función para recargar el carrito desde la BD
  const recargarCarrito = async () => {
    try {
      const sessionId = getSessionId();
      const carritoResult = await getCarrito(undefined, sessionId);
      if (!carritoResult.error) {
        setCarrito(carritoResult.data || []);
        // Disparar evento para actualizar el contador del header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('carrito-updated'));
        }
      }
    } catch (err) {
      console.error('Error recargando carrito:', err);
    }
  };

  const actualizarCantidad = async (id: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;

    try {
      const result = await actualizarCantidadCarrito(id, nuevaCantidad);
      if (result.error) {
        console.error('Error actualizando cantidad:', result.error);
        alert('Error al actualizar la cantidad. Por favor, intenta de nuevo.');
        return;
      }

      // Recargar carrito desde la BD para obtener datos actualizados
      await recargarCarrito();
    } catch (err) {
      console.error('Error actualizando cantidad:', err);
      alert('Error al actualizar la cantidad. Por favor, intenta de nuevo.');
    }
  };

  const eliminarItem = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
      return;
    }

    try {
      const result = await eliminarItemCarrito(id);
      if (result.error) {
        console.error('Error eliminando item:', result.error);
        alert('Error al eliminar el producto. Por favor, intenta de nuevo.');
        return;
      }

      // Recargar carrito desde la BD
      await recargarCarrito();
    } catch (err) {
      console.error('Error eliminando item:', err);
      alert('Error al eliminar el producto. Por favor, intenta de nuevo.');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setAuthLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Error con Google:', error);
        alert('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al iniciar sesión con Google. Por favor, intenta de nuevo.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      let result;
      
      if (emailAuthMode === 'login') {
        result = await signInWithEmail(emailForm.email, emailForm.password);
      } else {
        result = await signUpWithEmail(emailForm.email, emailForm.password, { nombre: emailForm.nombre });
      }

      if (result.error) {
        alert(result.error.message || 'Error al autenticar. Por favor, verifica tus datos.');
        return;
      }

      // Recargar usuario
      const { user: currentUser } = await getUser();
      setUser(currentUser);
      setShowEmailAuth(false);
      setEmailForm({ email: '', password: '', nombre: '' });
      
      // Autocompletar formulario con datos del cliente
      if (currentUser?.id) {
        try {
          const clienteResult = await getClienteByUserId(currentUser.id);
          if (clienteResult.data) {
            const cliente = clienteResult.data;
            setFormData((prev) => ({
              ...prev,
              nombre: cliente.nombre + (cliente.apellido ? ` ${cliente.apellido}` : '') || prev.nombre,
              telefono: cliente.telefono || cliente.whatsapp || prev.telefono,
            }));
          } else {
            // Usar datos del user metadata
            const nombreCompleto = 
              currentUser.user_metadata?.nombre ||
              currentUser.user_metadata?.full_name ||
              currentUser.email?.split('@')[0] ||
              '';
            
            if (nombreCompleto) {
              setFormData((prev) => ({
                ...prev,
                nombre: nombreCompleto || prev.nombre,
              }));
            }
          }
        } catch (err) {
          console.error('Error cargando datos del cliente:', err);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al autenticar. Por favor, intenta de nuevo.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (carrito.length === 0) {
      alert('Tu carrito está vacío. Agrega productos antes de realizar el pedido.');
      return;
    }

    try {
      setLoading(true);

      // Obtener cliente_id si el usuario está autenticado
      let clienteId: string | null = null;
      if (user?.id) {
        const clienteResult = await getClienteByUserId(user.id);
        if (clienteResult.data) {
          clienteId = clienteResult.data.id;
        }
      }

      // Separar nombre y apellido
      const nombreCompleto = formData.nombre.trim();
      const partesNombre = nombreCompleto.split(' ');
      const nombre = partesNombre[0] || '';
      const apellido = partesNombre.slice(1).join(' ') || null;

      // Preparar items del pedido
      const itemsPedido = carrito.map((item) => ({
        producto_id: item.producto_id,
        variante_id: item.variante_id || null,
        nombre_producto: item.producto_nombre || 'Producto',
        sku: item.producto_sku || null,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        subtotal: item.precio_unitario * item.cantidad,
      }));

      // Obtener ciudad seleccionada
      const ciudadSeleccionada = ciudades.find((c) => c.id === formData.ciudad);
      const nombreCiudad = ciudadSeleccionada?.nombre || formData.ciudad || null;

      // Mapear el código del método de pago al formato correcto de la BD
      const metodoPagoMap: Record<string, 'Efectivo' | 'Transferencia QR' | 'Tarjeta' | 'Otro'> = {
        'efectivo': 'Efectivo',
        'transferencia-qr': 'Transferencia QR',
        'transferencia_qr': 'Transferencia QR',
        'tarjeta': 'Tarjeta',
        'otro': 'Otro',
      };
      
      const metodoPagoFormateado = metodoPagoMap[metodoPago.toLowerCase()] || 'Efectivo';

      // Crear el pedido
      const pedidoResult = await crearPedido({
        cliente_id: clienteId || undefined,
        nombre_cliente: nombre || undefined,
        apellido_cliente: apellido || undefined,
        telefono_cliente: formData.telefono || undefined,
        email_cliente: user?.email || undefined,
        subtotal: subtotal,
        descuento: 0,
        costo_envio: envio,
        envio_prioritario: envioPrioritario,
        total: total,
        metodo_pago: metodoPagoFormateado,
        direccion_completa: formData.direccion || undefined,
        ciudad_envio: nombreCiudad || undefined,
        referencias_envio: undefined,
        departamento: nombreCiudad || undefined,
        items: itemsPedido,
      });

      if (pedidoResult.error || !pedidoResult.data) {
        console.error('Error creando pedido:', pedidoResult.error);
        alert('Error al crear el pedido. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Limpiar el carrito después de crear el pedido exitosamente
      try {
        const sessionId = getSessionId();
        const limpiarResult = await limpiarCarrito(clienteId || undefined, clienteId ? undefined : sessionId);
        
        if (limpiarResult.error) {
          console.error('Error limpiando carrito:', limpiarResult.error);
          // Continuar de todas formas, el pedido ya se creó
        }
        
        // Limpiar también el estado local del carrito
        setCarrito([]);
      } catch (err) {
        console.error('Error al limpiar carrito:', err);
        // Continuar de todas formas, el pedido ya se creó
      }

      // Disparar evento para actualizar el contador del header
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('carrito-updated'));
      }

      // Redirigir a la página de confirmación con el número de pedido y nombre
      const numeroPedido = pedidoResult.data.numero_pedido;
      const nombreCliente = nombre || formData.nombre.split(' ')[0] || 'Cliente';
      router.push(`/pedido-exitoso?pedido=${encodeURIComponent(numeroPedido)}&nombre=${encodeURIComponent(nombreCliente)}`);
    } catch (err) {
      console.error('Error al procesar el pedido:', err);
      alert('Error al procesar el pedido. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="max-w-7xl mx-auto">
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
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Lista de Productos */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap justify-between items-baseline gap-3 pb-6">
              <p className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                Tu Carrito
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                {carrito.length} artículos
              </p>
            </div>

            {carrito.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">Tu carrito está vacío</p>
                <Link
                  href="/tienda"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Ir a la tienda
                </Link>
              </div>
            ) : (
              <>
                <div className="flow-root">
                  <ul className="-my-6 divide-y divide-gray-200 dark:divide-gray-800" role="list">
                    {carrito.map((item) => {
                      // Extraer color y talla de variante_atributos si existe
                      const varianteInfo = item.variante_atributos || {};
                      const color = item.color || varianteInfo.color || varianteInfo.Color || varianteInfo.COLOR || null;
                      const talla = item.talla || varianteInfo.talla || varianteInfo.Talla || varianteInfo.TALLA || varianteInfo.size || varianteInfo.Size || varianteInfo.SIZE || null;
                      const varianteTexto = color || talla ? `${color ? `Color: ${color}` : ''}${color && talla ? ', ' : ''}${talla ? `Talla: ${talla}` : ''}` : null;

                      return (
                        <li key={item.id} className="flex py-6">
                          <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                            {item.imagen ? (
                              <Image
                                src={item.imagen}
                                alt={item.producto_nombre}
                                width={96}
                                height={96}
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">Sin imagen</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex flex-1 flex-col">
                            <div>
                              <div className="flex justify-between text-base font-medium text-gray-900 dark:text-white">
                                <h3>
                                  <Link href={`/producto/${item.producto_id}`} className="hover:text-blue-600">
                                    {item.producto_nombre}
                                  </Link>
                                </h3>
                                <div className="ml-4 flex items-baseline gap-2">
                                  <p>{formatPrice(item.precio_unitario)}</p>
                                  {item.producto_descuento && item.producto_descuento > 0 && item.producto_precio_original && item.producto_precio_original > item.precio_unitario && (
                                    <>
                                      <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                        {formatPrice(item.producto_precio_original)}
                                      </p>
                                      <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 text-xs font-semibold px-1.5 py-0.5 rounded">
                                        -{Math.round(item.producto_descuento)}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {varianteTexto && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  {varianteTexto}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-1 items-end justify-between text-sm">
                              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg">
                                <button
                                  onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                  className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  value={item.cantidad}
                                  readOnly
                                  className="w-10 text-center bg-transparent border-0 text-gray-900 dark:text-white focus:ring-0 p-0"
                                />
                                <button
                                  onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                  className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex">
                                <button
                                  onClick={() => eliminarItem(item.id)}
                                  className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-6">
                  <Link
                    href="/tienda"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Seguir Comprando
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Formulario de Checkout */}
          <div className="lg:col-span-1">
            {carrito.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-gray-900/50 rounded-xl p-6 shadow-lg dark:shadow-xl space-y-6">
                  {/* Resumen */}
                  <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-600 dark:text-gray-300">Subtotal</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatPrice(subtotal)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <p className="text-gray-600 dark:text-gray-300">Envío</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {envio === 0 ? 'Gratis' : formatPrice(envio)}
                      </p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                    <div className="flex justify-between items-center font-bold text-lg">
                      <p className="text-gray-900 dark:text-white">Total</p>
                      <p className="text-gray-900 dark:text-white">{formatPrice(total)}</p>
                    </div>
                  </div>

                  {/* Botones de Autenticación */}
                  {!user && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-center text-gray-900 dark:text-white text-lg">
                        Inicia sesión para continuar
                      </h3>
                      
                      <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={authLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {authLoading ? 'Cargando...' : 'Continuar con Google'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowEmailAuth(!showEmailAuth);
                          setEmailAuthMode('login');
                        }}
                        disabled={authLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">email</span>
                        <span className="font-medium">
                          Continuar con Correo
                        </span>
                      </button>

                      {showEmailAuth && (
                        <form onSubmit={handleEmailAuth} className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          {emailAuthMode === 'signup' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre
                              </label>
                              <input
                                type="text"
                                value={emailForm.nombre}
                                onChange={(e) => setEmailForm({ ...emailForm, nombre: e.target.value })}
                                placeholder="Tu nombre"
                                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 px-3 py-2 text-sm"
                                required={emailAuthMode === 'signup'}
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Correo electrónico
                            </label>
                            <input
                              type="email"
                              value={emailForm.email}
                              onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                              placeholder="correo@ejemplo.com"
                              className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 px-3 py-2 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Contraseña
                            </label>
                            <input
                              type="password"
                              value={emailForm.password}
                              onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                              placeholder="••••••••"
                              className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 px-3 py-2 text-sm"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={authLoading}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              {authLoading ? 'Cargando...' : emailAuthMode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEmailAuthMode(emailAuthMode === 'login' ? 'signup' : 'login');
                                setEmailForm({ email: '', password: '', nombre: '' });
                              }}
                              className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              {emailAuthMode === 'login' ? 'Registrarse' : 'Iniciar sesión'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {user && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                          <p className="text-sm text-green-800 dark:text-green-300">
                            Sesión iniciada como: {user.email}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const { error } = await signOut();
                            if (!error) {
                              // Limpiar session_id y carrito al cerrar sesión
                              clearSessionId();
                              setUser(null);
                              window.dispatchEvent(new Event('auth-state-changed'));
                              router.push('/');
                            } else {
                              alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Formulario */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-center text-gray-900 dark:text-white text-lg">
                      Rellena los datos y realiza tu pedido
                    </h3>

                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        htmlFor="name"
                      >
                        Nombre y Apellido
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                          <span className="material-symbols-outlined text-xl">person</span>
                        </span>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Nombre y Apellido"
                          className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 pl-10 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        htmlFor="phone"
                      >
                        Teléfono/WhatsApp
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400 text-sm">
                          +591
                        </span>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                          placeholder="Teléfono/WhatsApp"
                          className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 pl-14 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        htmlFor="city"
                      >
                        Ciudad
                      </label>
                      <select
                        id="city"
                        name="city"
                        required
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                        className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                      >
                        <option value="">Selecciona tu Ciudad</option>
                        {ciudades.map((ciudad) => (
                          <option key={ciudad.id} value={ciudad.nombre}>
                            {ciudad.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        htmlFor="address"
                      >
                        Dirección Completa
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                          <span className="material-symbols-outlined text-xl">location_on</span>
                        </span>
                        <input
                          id="address"
                          name="address"
                          type="text"
                          required
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                          placeholder="Dirección y Referencias Adicionales"
                          className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-600 focus:ring-blue-600 pl-10 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Envío Prioritario */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <label className="flex items-start cursor-pointer" htmlFor="priority-shipping">
                      <input
                        id="priority-shipping"
                        type="checkbox"
                        checked={envioPrioritario}
                        onChange={(e) => setEnvioPrioritario(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span className="ml-3 text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-bold">Agrega ENVÍO PRIORITARIO</span> por solo{' '}
                        <span className="font-bold">$7.00</span>
                        <span className="block text-xs text-gray-600 dark:text-gray-400">
                          Su pedido estará como prioridad en la entrega
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Método de pago
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {metodosPago.map((metodo) => (
                        <label
                          key={metodo.id}
                          className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-center text-sm font-medium ring-2 transition-colors ${
                            metodoPago === metodo.codigo
                              ? 'border-blue-600 bg-blue-50 dark:bg-gray-900/50 text-blue-600 dark:text-blue-400 ring-blue-600'
                              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={metodo.codigo}
                            checked={metodoPago === metodo.codigo}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="sr-only"
                          />
                          <span>{metodo.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Botón de Completar Pedido */}
                  <div className="space-y-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-lg border border-transparent bg-green-500 px-6 py-3.5 text-base font-bold text-white shadow-sm hover:bg-green-600 transition-colors"
                    >
                      COMPLETAR PEDIDO - {formatPrice(total)}
                    </button>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                      Una vez realices tu pedido, te enviaremos un mensaje por WhatsApp para
                      coordinar la entrega del mismo.
                    </p>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
