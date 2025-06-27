'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Home, Package, Users, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: Home },
  { href: '/admin/products', label: 'Produits', icon: Package },
  // { href: '/admin/users', label: 'Utilisateurs', icon: Users }, // Future
  // { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart }, // Future
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const getActivePath = (path: string) => {
    const parts = path.split('/');
    if (parts.length > 2 && /^[a-z]{2}$/.test(parts[1])) {
      return `/${parts.slice(2).join('/')}`;
    }
    return path;
  };

  const activePath = getActivePath(pathname);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-4">
        <nav className="flex flex-col gap-2">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
