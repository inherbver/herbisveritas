// src/components/layout/header-client.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import { Menu, Info } from "lucide-react";
import { CartSheet } from "@/components/domain/shop/cart-sheet";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";
import { useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "./locale-switcher";
import { useScroll } from "@/hooks/use-scroll";

const Logo = () => {
  const tGlobal = useTranslations("Global");
  return (
    <Link
      href="/"
      className="font-serif text-xl font-bold text-primary md:text-2xl"
      aria-label={tGlobal("Header.logoAriaLabel")}
    >
      In Herbis Veritas
    </Link>
  );
};

interface HeaderClientProps {
  isAdmin: boolean;
}

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error?: string;
}

export function HeaderClient({ isAdmin }: HeaderClientProps) {
  const scrolled = useScroll(10);
  const tGlobal = useTranslations("Global");
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    isLoading: true,
  });
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setAuthState((prev) => ({ ...prev, session: currentSession, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error refreshing session:", errorMessage);
      setAuthState((prev) => ({ ...prev, session: null, isLoading: false, error: errorMessage }));
    }
  }, [supabase]);

  useEffect(() => {
    refreshSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event, !!newSession);
      setAuthState({ session: newSession, isLoading: false });

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setTimeout(() => router.refresh(), 100);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, refreshSession]);

  const { session, isLoading } = authState;
  const isLoggedIn = !!session;

  return (
    <header
      suppressHydrationWarning
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-border/40 bg-background/80 border-b shadow-md backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      {/* 1. Barre d'annonce (Optionnelle) */}
      {/* Barre d'annonce - conditionnellement affichée si nécessaire à l'avenir */}
      <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground md:text-sm">
        <Info className="mr-1 inline h-3 w-3 md:mr-2 md:h-4 md:w-4" />
        Livraison offerte dès 50€ d'achat !
      </div>
      {/* 2. Barre Principale */}
      <div className="container flex h-16 items-center justify-between">
        {/* 3. Logo */}
        <div className="flex items-center gap-6">
          <Logo />
          {/* 4. Navigation Principale (Desktop) */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/shop" className={navigationMenuTriggerStyle()}>
                  {tGlobal("Header.home")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/contact" className={navigationMenuTriggerStyle()}>
                  {tGlobal("Header.contactLink")}
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/about" className={navigationMenuTriggerStyle()}>
                  {tGlobal("Header.aboutLink")}
                </Link>
              </NavigationMenuItem>
              {isAdmin && (
                <NavigationMenuItem>
                  <Link href="/admin" className={navigationMenuTriggerStyle()}>
                    Admin
                  </Link>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* 5. Actions Utilisateur (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <CartSheet />
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-10 w-20 animate-pulse rounded-md bg-gray-200"></div>
              <div className="h-10 w-24 animate-pulse rounded-md bg-gray-200"></div>
            </div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/profile/account">
                <Button variant="ghost" size="sm">
                  {tGlobal("Header.accountAriaLabel")}
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="secondary" size="sm">
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {tGlobal("Header.login")}
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="default" size="sm">
                  {tGlobal("Header.register")}
                </Button>
              </Link>
            </>
          )}
        </div>
        {/* Mobile Menu Trigger (Hamburger) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">{tGlobal("Header.mobileMenuAriaLabel")}</span>{" "}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] pt-10 sm:w-[350px]">
            <SheetHeader className="mb-6 text-center">
              {/* Ajout du logo ici, centré et avec une marge en bas */}
              <div className="mx-auto mb-4 w-fit">
                <Logo />
              </div>
              <SheetTitle className="text-2xl font-bold">
                {tGlobal("Header.mobileSheetTitle")}
              </SheetTitle>{" "}
              <SheetDescription>{tGlobal("Header.mobileSheetDescription")}</SheetDescription>{" "}
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              <SheetClose asChild>
                <Link
                  href="/shop"
                  className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {tGlobal("Header.home")}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/contact"
                  className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {tGlobal("Header.contactLink")}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/about"
                  className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {tGlobal("Header.aboutLink")}
                </Link>
              </SheetClose>

              <hr className="my-4 border-border" />

              {isLoading ? (
                <div className="mb-2 h-10 w-full animate-pulse rounded-md bg-gray-200"></div>
              ) : isLoggedIn ? (
                <>
                  <SheetClose asChild>
                    <Link
                      href="/profile/account"
                      className="text-foreground/80 -mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {tGlobal("Header.accountAriaLabel")}
                    </Link>
                  </SheetClose>
                  {isAdmin && (
                    <SheetClose asChild>
                      <Link
                        href="/admin"
                        className="text-foreground/80 -mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Admin
                      </Link>
                    </SheetClose>
                  )}
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Link
                      href="/login"
                      className="text-foreground/80 -mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {tGlobal("Header.login")}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/register"
                      className="text-foreground/80 -mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {tGlobal("Header.register")}
                    </Link>
                  </SheetClose>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
