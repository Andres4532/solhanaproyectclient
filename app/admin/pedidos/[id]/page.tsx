export default function PedidoDetallePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Detalle de Pedido</h1>
      <p className="text-gray-600">ID: {params.id}</p>
      <p className="text-gray-600">Página en construcción</p>
    </div>
  );
}

