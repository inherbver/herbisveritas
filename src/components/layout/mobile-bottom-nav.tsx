"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import { useTranslations } from "next-intl";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Global");
  const cartItems = useCartStore((state) => state.items);
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Hide on certain pages
  const shouldHide =
    pathname.includes("/checkout") || pathname.includes("/login") || pathname.includes("/register");

  if (shouldHide) return null;

  const navItems: NavItem[] = [
    {
      href: "/",
      icon: Home,
      label: t("home"),
    },
    {
      href: "/shop",
      icon: ShoppingBag,
      label: t("shop"),
    },
    {
      href: "/cart",
      icon: ShoppingCart,
      label: t("cart"),
      badge: cartItemCount,
    },
    {
      href: "/profile/account",
      icon: User,
      label: t("account"),
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur sm:hidden"
    >
      <div className="pb-safe flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] flex-1 touch-manipulation flex-col items-center justify-center rounded-lg px-1 py-2 transition-colors active:scale-95",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileBottomNavSpacer() {
  const pathname = usePathname();

  // Hide on certain pages
  const shouldHide =
    pathname.includes("/checkout") || pathname.includes("/login") || pathname.includes("/register");

  if (shouldHide) return null;

  // Add spacing to prevent content from being hidden behind the bottom nav
  return <div className="h-16 sm:hidden" aria-hidden="true" />;
}
