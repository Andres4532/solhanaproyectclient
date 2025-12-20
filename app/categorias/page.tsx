import Link from 'next/link';
import { getCategorias } from '@/lib/supabase-queries';

export default async function CategoriasPage() {
  const result = await getCategorias();
  const categorias = result.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Categorías</h1>

      {categorias.length === 0 ? (
        <p className="text-gray-600">Página en construcción</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categorias.map((categoria: any) => {
            const imagen = categoria.imagen_url;
            if (!imagen) return null;
            return (
              <Link
                key={categoria.id}
                href={`/tienda?categoria=${categoria.id}`}
                className="relative group overflow-hidden rounded-xl aspect-[4/3]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${imagen}')` }}
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative flex h-full flex-col items-center justify-center p-6 text-white">
                  <h3 className="text-xl font-bold text-center">{categoria.nombre}</h3>
                  <span className="mt-3 text-sm font-semibold underline underline-offset-4">
                    Ver productos
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

