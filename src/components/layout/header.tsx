// src/components/layout/header.tsx
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
  NavigationMenuLink,
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
import { User, Menu, Info } from "lucide-react";
import { CartSheet } from "@/components/domain/shop/cart-sheet";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import LocaleSwitcher from "./locale-switcher";

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

export function Header() {
  const tGlobal = useTranslations("Global");
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // État de chargement
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fonction pour rafraîchir la session, mise en cache avec useCallback
  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
    } catch (error) {
      console.error("Error refreshing session:", error);
      setSession(null); // S'assurer que la session est nulle en cas d'erreur
    } finally {
      setIsLoading(false); // Terminer le chargement dans tous les cas
    }
  }, [supabase]); // Dépendance à supabase

  useEffect(() => {
    // Récupérer la session initiale au montage du composant
    refreshSession();

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event, !!newSession); // Log pour débogage

      setSession(newSession); // Mettre à jour l'état de la session
      setIsLoading(false); // S'assurer que le chargement est terminé

      // Stratégie de synchronisation améliorée
      // Rafraîchir la page seulement pour les événements de connexion/déconnexion
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        // Introduire un petit délai pour permettre la propagation des cookies
        // avant de rafraîchir la route. Ajustez le délai si nécessaire.
        setTimeout(() => {
          router.refresh();
        }, 100); // Délai de 100ms, à ajuster
      }
    });

    // Nettoyer l'écouteur lors du démontage du composant
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [supabase, router, refreshSession]); // Dépendances du useEffect

  const isLoggedIn = !!session; // Déterminer si l'utilisateur est connecté

  // Reste du JSX du Header (Navigation, boutons, etc.)
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      {/* 1. Barre d'annonce (Optionnelle) */}
      {/* Barre d'annonce - conditionnellement affichée si nécessaire à l'avenir */}
      <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground md:text-sm">
        <Info className="mr-1 inline h-3 w-3 md:mr-2 md:h-4 md:w-4" />
        Livraison offerte dès 50€ d'achat !
      </div>
      {/* 2. Barre Principale */}
      <div className="container flex h-16 items-center justify-between">
        {/* 3. Logo */}
        <div className="mr-4 flex">
          <Logo />
        </div>

        {/* 4. Navigation Principale (Desktop) */}
        <nav className="hidden flex-1 md:flex md:justify-center">
          <NavigationMenu>
            <NavigationMenuList className="gap-6">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/shop" className={navigationMenuTriggerStyle()}>
                    {tGlobal("Header.home")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/magazine" className={navigationMenuTriggerStyle()}>
                    {tGlobal("Header.products")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/about" className={navigationMenuTriggerStyle()}>
                    {tGlobal("Header.aboutLink")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/contact" className={navigationMenuTriggerStyle()}>
                    {tGlobal("Header.contactLink")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* 5. Actions Utilitaires (Desktop) + Trigger Mobile */}
        <div className="flex items-center justify-end gap-2 md:gap-3">
          {/* Icons */}
          <LocaleSwitcher />
          <Button variant="ghost" size="icon" aria-label={tGlobal("Header.accountAriaLabel")}>
            {" "}
            <User className="h-5 w-5" />
          </Button>
          <CartSheet /> {/* Remplacement du bouton Panier */}
          {/* Auth Buttons (Desktop) */}
          <div className="hidden items-center gap-2 md:flex">
            {/* TODO: Add conditional logic based on isLoggedIn */}
            {isLoading ? (
              // Placeholder pendant le chargement pour éviter le flash de contenu
              <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200"></div>
            ) : isLoggedIn ? (
              <Link href="/profile/account">
                <Button variant="outline" size="sm">
                  {tGlobal("Header.accountAriaLabel")}
                </Button>
              </Link>
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
                    href="/magazine"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.products")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/mission"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.mission")}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/contact"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.about")}
                  </Link>
                </SheetClose>

                <hr className="my-4 border-border" />

                {isLoading ? (
                  <div className="mb-2 h-10 w-full animate-pulse rounded-md bg-gray-200"></div>
                ) : isLoggedIn ? (
                  <SheetClose asChild>
                    <Link
                      href="/profile/account"
                      className="text-foreground/80 -mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {tGlobal("Header.accountAriaLabel")}
                    </Link>
                  </SheetClose>
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
      </div>
    </header>
  );
}
