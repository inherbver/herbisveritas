"use client";

import Link from "next/link";
import { Package, FileText, MapPin, Handshake, Users, ShoppingCart, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface DashboardItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  count?: number;
}

const dashboardItems: DashboardItem[] = [
  {
    href: "/admin/products",
    label: "Produits",
    description: "Gérer le catalogue",
    icon: Package,
    color: "text-blue-600 bg-blue-100",
  },
  {
    href: "/admin/magazine",
    label: "Magazine",
    description: "Articles et blog",
    icon: FileText,
    color: "text-green-600 bg-green-100",
  },
  {
    href: "/admin/markets",
    label: "Marchés",
    description: "Points de vente",
    icon: MapPin,
    color: "text-purple-600 bg-purple-100",
  },
  {
    href: "/admin/partners",
    label: "Partenaires",
    description: "Boutiques partenaires",
    icon: Handshake,
    color: "text-orange-600 bg-orange-100",
  },
  {
    href: "/admin/users",
    label: "Utilisateurs",
    description: "Gestion des comptes",
    icon: Users,
    color: "text-pink-600 bg-pink-100",
  },
  {
    href: "/admin/newsletter",
    label: "Newsletter",
    description: "Abonnés newsletter",
    icon: Mail,
    color: "text-indigo-600 bg-indigo-100",
  },
  {
    href: "/admin/orders",
    label: "Commandes",
    description: "Bientôt disponible",
    icon: ShoppingCart,
    color: "text-gray-400 bg-gray-100",
  },
];

export function MobileDashboardGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 md:hidden">
      {dashboardItems.map((item) => {
        const isDisabled = item.href === "/admin/orders";

        return (
          <Link
            key={item.href}
            href={isDisabled ? "#" : item.href}
            className={cn(
              "block touch-manipulation transition-transform active:scale-95",
              isDisabled && "pointer-events-none opacity-50"
            )}
          >
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className={cn("mb-2 inline-flex rounded-lg p-3", item.color)}>
                  <item.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base">{item.label}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {item.description}
                </CardDescription>
              </CardHeader>
              {item.count !== undefined && (
                <CardContent>
                  <p className="text-2xl font-bold">{item.count}</p>
                </CardContent>
              )}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function DesktopDashboardGrid() {
  return (
    <div className="hidden gap-4 md:grid md:grid-cols-3 lg:grid-cols-4">
      {dashboardItems.map((item) => {
        const isDisabled = item.href === "/admin/orders";

        return (
          <Link
            key={item.href}
            href={isDisabled ? "#" : item.href}
            className={cn(
              "block transition-transform hover:scale-105",
              isDisabled && "pointer-events-none opacity-50"
            )}
          >
            <Card className="h-full transition-all hover:shadow-xl">
              <CardHeader>
                <div className={cn("mb-3 inline-flex rounded-lg p-4", item.color)}>
                  <item.icon className="h-8 w-8" />
                </div>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              {item.count !== undefined && (
                <CardContent>
                  <p className="text-3xl font-bold">{item.count}</p>
                </CardContent>
              )}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
