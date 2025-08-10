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
import { CartSheet } from "@/components/features/shop/cart-sheet";
import { cn } from "@/utils/cn";
import { useSafeTranslations, useSafePathname, useSafeRouter } from "@/hooks/use-safe-intl";
import LocaleSwitcher from "./locale-switcher";
import { useScroll } from "@/hooks/use-scroll";
import { motion } from "framer-motion";

const Logo = () => {
  const tGlobal = useSafeTranslations("Global");
  return (
    <Link
      href="/"
      className="font-serif text-xl font-bold text-primary md:text-2xl"
      aria-label={tGlobal("Header.logoAriaLabel")}
      data-testid="logo-link"
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
  const pathname = useSafePathname();
  const tGlobal = useSafeTranslations("Global");
  const router = useSafeRouter();

  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    isLoading: true,
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const refreshSession = useCallback(async () => {
    try {
      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Session_Timeout")), 3000)
      );

      const sessionPromise = supabase.auth.getSession();

      const {
        data: { session: currentSession },
      } = await Promise.race([sessionPromise, timeoutPromise]);

      setAuthState((prev) => ({ ...prev, session: currentSession, isLoading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      // Gestion silencieuse des erreurs réseau temporaires
      if (
        errorMessage === "Session_Timeout" ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("network")
      ) {
        console.warn(
          "HeaderClient: Network/timeout error during session refresh - continuing silently:",
          errorMessage
        );
        // Ne pas afficher d'erreur, juste marquer comme pas loading
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      } else {
        console.error("Error refreshing session:", errorMessage);
        setAuthState((prev) => ({ ...prev, session: null, isLoading: false, error: errorMessage }));
      }
    }
  }, [supabase]);

  useEffect(() => {
    refreshSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event, !!newSession);
      setAuthState({ session: newSession, isLoading: false });

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setTimeout(() => router?.refresh(), 100);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, refreshSession]);

  const { session, isLoading } = authState;
  const isLoggedIn = !!session;

  const navLinks = [
    { href: "/shop", label: tGlobal("Header.home") },
    { href: "/magazine", label: "Magazine" },
    { href: "/contact", label: tGlobal("Header.findUs") },
    { href: "/about", label: tGlobal("Header.aboutLink") },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      suppressHydrationWarning
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled
          ? "border-border/40 bg-background/80 dark:bg-background/90 dark:border-foreground/10 shadow-md backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      {/* 1. Barre d'annonce (Optionnelle) */}
      <div className="flex h-8 items-center justify-center bg-primary text-center text-xs font-medium text-primary-foreground">
        <Info className="mr-2 h-3.5 w-3.5" />
        <span>{tGlobal("Header.promoBanner")}</span>
      </div>
      {/* 2. Barre Principale */}
      <div className="container flex h-16 items-center justify-between">
        {/* 3. Logo */}
        <div className="flex items-center gap-6">
          <Logo />
          {/* 4. Navigation Principale (Desktop) */}
          <NavigationMenu className="hidden md:flex" data-testid="main-navigation">
            <NavigationMenuList>
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <NavigationMenuItem key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        isActive ? "text-primary" : "text-foreground/80"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuItem>
                );
              })}
              {isAdmin && (
                <NavigationMenuItem>
                  <Link
                    href="/admin"
                    className={navigationMenuTriggerStyle()}
                    data-testid="admin-nav-link"
                  >
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
              <Link href="/profile/account" data-testid="profile-link">
                <Button variant="ghost" size="sm" data-testid="profile-button">
                  {tGlobal("Header.accountAriaLabel")}
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin" data-testid="admin-link">
                  <Button variant="secondary" size="sm" data-testid="admin-button">
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-2xl">
                <Link href="/login" data-testid="login-link">
                  {tGlobal("Header.login")}
                </Link>
              </Button>
              <Button asChild variant="primary" size="sm" className="rounded-2xl">
                <Link href="/register">{tGlobal("Header.register")}</Link>
              </Button>
            </>
          )}
        </div>
        {/* Mobile Actions: Cart + Menu */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Panier mobile - visible directement */}
          <CartSheet />

          {/* Mobile Menu Trigger (Hamburger) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent/50 touch-manipulation transition-transform duration-200 active:scale-95"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">{tGlobal("Header.mobileMenuAriaLabel")}</span>{" "}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] transform-gpu touch-manipulation pt-10 will-change-transform sm:w-[350px]"
            >
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
                    className="text-foreground/80 active:bg-accent/80 touch-manipulation rounded-md px-3 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.home")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/magazine"
                    className="text-foreground/80 active:bg-accent/80 touch-manipulation rounded-md px-3 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
                  >
                    Magazine
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/contact"
                    className="text-foreground/80 active:bg-accent/80 touch-manipulation rounded-md px-3 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.contactLink")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/about"
                    className="text-foreground/80 active:bg-accent/80 touch-manipulation rounded-md px-3 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
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
                        className="text-foreground/80 active:bg-accent/80 -mx-3 block touch-manipulation rounded-lg px-3 py-3 text-base font-semibold leading-7 transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
                      >
                        {tGlobal("Header.accountAriaLabel")}
                      </Link>
                    </SheetClose>
                    {isAdmin && (
                      <SheetClose asChild>
                        <Link
                          href="/admin"
                          className="text-foreground/80 active:bg-accent/80 -mx-3 block touch-manipulation rounded-lg px-3 py-3 text-base font-semibold leading-7 transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
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
                        className="text-foreground/80 active:bg-accent/80 -mx-3 block touch-manipulation rounded-lg px-3 py-3 text-base font-semibold leading-7 transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
                      >
                        {tGlobal("Header.login")}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/register"
                        className="text-foreground/80 active:bg-accent/80 -mx-3 block touch-manipulation rounded-lg px-3 py-3 text-base font-semibold leading-7 transition-all duration-200 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground"
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
      </div>
    </motion.header>
  );
}
