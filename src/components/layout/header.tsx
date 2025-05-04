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
  // navigationMenuTriggerStyle, // Import if using default trigger styles
} from "@/components/ui/navigation-menu";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "@/components/ui/sheet";
import { ShoppingCart, User, Menu, Info } from "lucide-react"; // Icons

// Placeholder pour le composant Logo
const Logo = () => (
  <Link
    href="/"
    className="font-serif text-xl font-bold text-primary md:text-2xl"
    aria-label="In Herbis Veritas - Accueil"
  >
    In Herbis Veritas
  </Link>
);

export function Header() {
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
          {" "}
          {/* Centered navigation */}
          <NavigationMenu>
            <NavigationMenuList className="gap-6">
              <NavigationMenuItem>
                <Link href="/" legacyBehavior passHref>
                  <NavigationMenuLink className="text-foreground/80 text-sm font-semibold transition-colors hover:text-foreground">
                    Accueil
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/shop" legacyBehavior passHref>
                  <NavigationMenuLink className="text-foreground/80 text-sm font-semibold transition-colors hover:text-foreground">
                    Produits
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/about" legacyBehavior passHref>
                  <NavigationMenuLink className="text-foreground/80 text-sm font-semibold transition-colors hover:text-foreground">
                    À Propos
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              {/* Add more links if needed */}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* 5. Actions Utilitaires (Desktop) + Trigger Mobile */}
        <div className="flex items-center justify-end gap-2 md:gap-3">
          {/* Icons */}
          <Button variant="ghost" size="icon" aria-label="Mon compte">
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Panier">
            <ShoppingCart className="h-5 w-5" />
            {/* Optional: Badge for item count */}
            {/* {cartItemCount > 0 && ( */}
            {/*   <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"> */}
            {/*     {cartItemCount} */}
            {/*   </span> */}
            {/* )} */}
          </Button>

          {/* Auth Buttons (Desktop) */}
          <div className="hidden items-center gap-2 md:flex">
            {/* TODO: Add conditional logic based on isLoggedIn */}
            {isLoggedIn ? (
              <Button variant="outline" size="sm">
                Mon Compte
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm">
                  Connexion
                </Button>
                <Button variant="default" size="sm">
                  Inscription
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger (Hamburger) */}
          <Sheet>
            {" "}
            {/* Wrap trigger and content */}
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] pt-10 sm:w-[350px]">
              {/* Add Logo inside sheet */}
              <div className="mb-6 pl-4">
                <Logo />
              </div>
              <nav className="flex flex-col gap-4 px-4">
                <SheetClose asChild>
                  <Link
                    href="/"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Accueil
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/shop"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Produits
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/about"
                    className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    À Propos
                  </Link>
                </SheetClose>

                {/* Optional separator */}
                <hr className="my-4 border-border" />

                {/* Mobile Auth Buttons/Links */}
                {isLoggedIn ? (
                  <SheetClose asChild>
                    <Link
                      href="/account" // Example account link
                      className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Mon Compte
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/login" // Example login link
                        className="text-foreground/80 rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Connexion
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/register" // Example register link
                        className="hover:bg-primary/90 rounded-md bg-primary px-3 py-2 text-base font-medium text-primary-foreground transition-colors"
                      >
                        Inscription
                      </Link>
                    </SheetClose>
                  </>
                )}
              </nav>

              {/* Explicit Close Button (Optional but good UX) */}
              {/* 
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                  <X className="h-5 w-5"/>
                  <span className="sr-only">Fermer</span>
                </Button>
              </SheetClose>
               */}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
