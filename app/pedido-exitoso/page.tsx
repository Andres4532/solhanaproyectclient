'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPedidoByNumero } from '@/lib/supabase-queries';
import type { Pedido } from '@/types/database';

export default function PedidoExitosoPage() {
  const searchParams = useSearchParams();
  const numeroPedido = searchParams.get('pedido');
  const nombreClienteParam = searchParams.get('nombre') || 'Cliente';
  
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');

  // Número de WhatsApp (configurable)
  const WHATSAPP_NUMBER = '59169023826';

  useEffect(() => {
    async function loadPedido() {
      if (!numeroPedido) {
        setLoading(false);
        return;
      }

      try {
        const result = await getPedidoByNumero(numeroPedido);
        if (result.data) {
          setPedido(result.data);
          // Construir mensaje de WhatsApp
          const mensaje = construirMensajeWhatsApp(result.data);
          const url = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`;
          setWhatsappUrl(url);
        }
      } catch (err) {
        console.error('Error cargando pedido:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPedido();
  }, [numeroPedido]);

  const construirMensajeWhatsApp = (pedido: any): string => {
    // Obtener nombre del cliente
    const nombre = pedido.nombre_cliente || nombreClienteParam;
    
    // Obtener número de pedido
    const numPedido = pedido.numero_pedido || '';
    
    // Obtener lista de productos (items puede venir en la respuesta de Supabase)
    const items = (pedido.items || []) as Array<{ nombre_producto: string }>;
    const productos = items.length > 0 
      ? items.map((item: { nombre_producto: string }) => item.nombre_producto).join(', ')
      : 'Productos';
    
    // Construir mensaje de envío prioritario
    const envioPrioritario = pedido.envio_prioritario ? ', ENVÍO PRIORITARIO' : '';
    
    // Obtener dirección y ciudad
    const direccion = pedido.direccion_completa || 'Dirección no especificada';
    const ciudad = pedido.ciudad_envio || 'Ciudad no especificada';
    
    // Obtener método de pago
    const metodoPago = pedido.metodo_pago || 'Pago en Casa';
    
    // Construir el mensaje completo
    const mensaje = `Hola, soy ${nombre} ✅\nConfirmo que mi dirección está completa para la entrega del pedido #${numPedido}: ${productos}${envioPrioritario}.\n\n📍 Dirección: ${direccion}, ${ciudad} (${metodoPago})\n\n📍 A continuación envío mi GPS para mayor precisión.`;
    
    return mensaje;
  };

  const handleWhatsAppClick = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    }
  };

  const nombreCliente = pedido?.nombre_cliente || nombreClienteParam;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center">
        {/* Ilustración del delivery - Persona con caja */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-40 h-40">
            {/* Caja de cartón */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-24 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-lg shadow-md flex items-center justify-center border-2 border-amber-200 dark:border-amber-800">
              <div className="w-16 h-16 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-amber-700 dark:text-amber-300">@</span>
              </div>
            </div>
            {/* Persona (cabeza y torso) */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
              <div className="relative">
                {/* Cabeza */}
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-4xl">😊</span>
                </div>
                {/* Torso (chaqueta) */}
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-gray-800 dark:bg-gray-600 rounded-t-lg"></div>
                {/* Camisa blanca */}
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-12 h-8 bg-white dark:bg-gray-500 rounded-t"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Título principal */}
        <h1 className="text-5xl md:text-6xl font-black text-blue-400 mb-8 leading-tight tracking-tight">
          ¡PEDIDO<br />RECIBIDO!
        </h1>

        {/* Mensaje personalizado */}
        <div className="mb-8">
          <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-3">
            ¡Gracias {nombreCliente}! 🎉
          </p>
          <p className="text-base md:text-lg text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
            Por favor confirma tu pedido por WhatsApp para que podamos entregar tu pedido.
            <span className="inline-block ml-2 w-5 h-5 bg-green-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </span>
          </p>
        </div>

        {/* Botón de WhatsApp */}
        <div className="mt-10">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            disabled={!whatsappUrl || loading}
            className="w-full bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1DA851] text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-7 h-7"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span>Clic aquí para confirmar</span>
          </button>
        </div>

        {/* Información del pedido (opcional, más discreto) */}
        {numeroPedido && (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>Número de pedido: <span className="font-semibold text-gray-700 dark:text-gray-300">{numeroPedido}</span></p>
          </div>
        )}

        {/* Botón para volver a la tienda */}
        <div className="mt-8">
          <Link
            href="/tienda"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline text-sm"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
