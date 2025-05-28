// src/components/layout/header.tsx
"use client"; // Add if state or client hooks needed later

import Link from "next/link";
import React from "react"; // Keep if using state for mobile menu
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle, // Import if using default trigger styles
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet"; // Importer SheetDescription
import { User, Menu, Info } from "lucide-react"; // Icons
import { CartSheet } from "@/components/domain/shop/cart-sheet"; // Ajout de l'import
import { useTranslations } from "next-intl"; // Correction de l'import
import LocaleSwitcher from "./locale-switcher"; // Import du composant

// Placeholder pour le composant Logo
const Logo = () => {
  const tGlobal = useTranslations("Global"); // Ajout pour accéder aux traductions dans Logo
  return (
    <Link
      href="/"
      className="font-serif text-xl font-bold text-primary md:text-2xl"
      aria-label={tGlobal("Header.logoAriaLabel")} // Traduction
    >
      In Herbis Veritas
    </Link>
  );
};

export function Header() {
  const tGlobal = useTranslations("Global");

  // const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false); // State for mobile menu - uncomment if needed

  // Placeholder for dynamic data (e.g., cart count, auth status)
  const isLoggedIn = false; // Example: replace with actual auth check
  const showAnnouncementBar = true; // Example: control visibility

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      {/* 1. Barre d'annonce (Optionnelle) */}
      {showAnnouncementBar && (
        <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground md:text-sm">
          <Info className="mr-1 inline h-3 w-3 md:mr-2 md:h-4 md:w-4" />
          Livraison offerte dès 50€ d'achat !
        </div>
      )}

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
                    {tGlobal("Header.home")} {/* Traduction */}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/magazine" className={navigationMenuTriggerStyle()}>
                    {tGlobal("Header.products")} {/* Traduction */}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/contact" className={navigationMenuTriggerStyle()}>
                    {tGlobal("Header.about")} {/* Traduction */}
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
            {/* Traduction */}
            <User className="h-5 w-5" />
          </Button>
          <CartSheet /> {/* Remplacement du bouton Panier */}
          {/* Auth Buttons (Desktop) */}
          <div className="hidden items-center gap-2 md:flex">
            {/* TODO: Add conditional logic based on isLoggedIn */}
            {isLoggedIn ? (
              <Button variant="outline" size="sm">
                {tGlobal("Header.accountAriaLabel")} {/* Traduction */}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm">
                  {tGlobal("Header.login")} {/* Traduction */}
                </Button>
                <Button variant="default" size="sm">
                  {tGlobal("Header.register")} {/* Traduction */}
                </Button>
              </>
            )}
          </div>
          {/* Mobile Menu Trigger (Hamburger) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{tGlobal("Header.mobileMenuAriaLabel")}</span>{" "}
                {/* Traduction et clé mise à jour */}
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
                {/* Traduction et clé mise à jour */}
                <SheetDescription>{tGlobal("Header.mobileSheetDescription")}</SheetDescription>{" "}
                {/* Traduction et clé mise à jour */}
              </SheetHeader>
              <nav className="flex flex-col gap-4 px-4">
                <SheetClose asChild>
                  <Link
                    href="/shop"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.home")} {/* Traduction */}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/magazine"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.products")} {/* Traduction */}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/contact"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {tGlobal("Header.about")} {/* Traduction */}
                  </Link>
                </SheetClose>

                <hr className="my-4 border-border" />

                {isLoggedIn ? (
                  <SheetClose asChild>
                    <Link
                      href="/account"
                      className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {tGlobal("Header.account")} {/* Traduction */}
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/login"
                        className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {tGlobal("Header.login")} {/* Traduction */}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/register"
                        className="hover:bg-primary/90 rounded-md bg-primary px-3 py-2 text-base font-medium text-primary-foreground transition-colors"
                      >
                        {tGlobal("Header.register")} {/* Traduction */}
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
