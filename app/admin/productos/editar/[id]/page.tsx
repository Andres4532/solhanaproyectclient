export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Editar Producto</h1>
      <p className="text-gray-600">ID: {id}</p>
      <p className="text-gray-600">Página en construcción</p>
    </div>
  );
}

