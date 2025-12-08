'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DashboardIcon, OrdersIcon, ProductsIcon } from '@/components/Icons';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: DashboardIcon },
    { href: '/admin/pedidos', label: 'Pedidos', icon: OrdersIcon },
    { href: '/admin/productos', label: 'Productos', icon: ProductsIcon },
    { href: '/admin/clientes', label: 'Clientes', icon: ProductsIcon },
    { href: '/admin/analiticas', label: 'Analíticas', icon: DashboardIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h2 className="text-2xl font-bold">Admin Panel</h2>
        </div>
        <nav className="mt-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 ${
                  isActive ? 'bg-gray-800' : 'hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}

