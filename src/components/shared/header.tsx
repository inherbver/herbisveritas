"use client";

import React from "react";
import { Logo, Link, SkipNavLink } from "@/components/primitives"; // Import des primitifs
import { Button } from "@/components/ui/button";
import { Menu, ShoppingCart, User } from "lucide-react"; // Icônes
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const Header = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    const t = useTranslations("Header"); // Example translation usage

    return (
      <header
        ref={ref}
        className={cn(
          "bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur",
          className
        )}
        {...props}
      >
        <SkipNavLink />
        <div className="container flex h-16 items-center justify-between">
          {/* Logo linked to homepage */}
          <div className="flex items-center">
            <Link href={{ pathname: "/" }} aria-label="Retour à l'accueil">
              <Logo className="h-8 w-auto" />
            </Link>
          </div>

          {/* Navigation Principale (Desktop) */}
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            {/* Exemple de liens - à remplacer par vos vrais liens */}
            <Link href={{ pathname: "/" }}>{t("home")}</Link>
            <Link href={{ pathname: "/products" }}>{t("products")}</Link>
            <Link href={{ pathname: "/about" }}>{t("about")}</Link>
            {/* Ajouter d'autres liens ici... */}
          </nav>

          {/* Actions Utilisateur & Menu Mobile */}
          <div className="flex flex-1 items-center justify-end space-x-4">
            {/* Actions Desktop (Panier, Compte) */}
            <div className="hidden items-center space-x-2 md:flex">
              <Button variant="ghost" size="icon" aria-label="Panier">
                <ShoppingCart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Compte Utilisateur">
                <User className="h-5 w-5" />
              </Button>
              {/* Ajouter Sélecteur de Langue ici si besoin */}
            </div>

            {/* Bouton Menu Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Ouvrir le menu"
              // onClick={() => setIsMobileMenuOpen(true)} // Logique à implémenter
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* TODO: Implémenter le menu mobile (ex: avec Sheet ou DropdownMenu) */}
        {/* {isMobileMenuOpen && (...)} */}
      </header>
    );
  }
);

Header.displayName = "Header";

export { Header };
