"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Home, Package, Users, FileText, MapPin, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/utils/cn";

const navItems = [
  { href: "/admin", label: "Vue d'ensemble", icon: Home },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/magazine", label: "Magazine", icon: FileText },
  { href: "/admin/markets", label: "Marchés", icon: MapPin },
  { href: "/admin/partners", label: "Partenaires", icon: Handshake },
  { href: "/admin/users", label: "Gestions utilisateurs", icon: Users },
  // { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart }, // Future
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const getActivePath = (path: string) => {
    const parts = path.split("/");
    if (parts.length > 2 && /^[a-z]{2}$/.test(parts[1])) {
      return `/${parts.slice(2).join("/")}`;
    }
    return path;
  };

  const activePath = getActivePath(pathname);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="min-h-[44px] min-w-[44px] touch-manipulation active:scale-95 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-4">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu de navigation</SheetTitle>
          <SheetDescription>
            Liste des liens pour naviguer dans le panneau d'administration.
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-2">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Dashboard</h2>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex min-h-[44px] touch-manipulation items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors active:scale-95 hover:bg-muted hover:text-primary",
                activePath === item.href && "bg-muted text-primary"
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
