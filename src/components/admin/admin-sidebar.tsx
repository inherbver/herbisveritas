'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Users, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: Home },
  { href: '/admin/products', label: 'Produits', icon: Package },
  // { href: '/admin/users', label: 'Utilisateurs', icon: Users }, // Future
  // { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart }, // Future
];

export function AdminSidebar() {
  const pathname = usePathname();

  // Helper to remove locale from pathname for comparison
  const getActivePath = (path: string) => {
    const parts = path.split('/');
    if (parts.length > 2 && /^[a-z]{2}$/.test(parts[1])) {
      return `/${parts.slice(2).join('/')}`;
    }
    return path;
  };

  const activePath = getActivePath(pathname);

  return (
    <aside className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
      <nav className="flex flex-col gap-2">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">
          Dashboard
        </h2>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary',
              activePath === item.href && 'bg-muted text-primary'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
