'use client';

import React from 'react';
import { Logo, Link, SkipNavLink } from '@/components/primitives'; // Import des primitifs
import { Button } from '@/components/ui/button';
import { Menu, ShoppingCart, User } from 'lucide-react'; // Icônes
import { cn } from '@/lib/utils';
// Importer les hooks de next-intl si besoin (ex: pour un sélecteur de langue)
// import { usePathname } from '@/i18n/navigation';
// import { useLocale, useTranslations } from 'next-intl';

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, ...props }, ref) => {
    // const pathname = usePathname(); // Pourrait être utilisé pour les liens actifs
    // const t = useTranslations('Navigation'); // Pour les textes des liens
    // const locale = useLocale();

    // État pour le menu mobile (exemple)
    // const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          className
        )}
        {...props}
      >
        <SkipNavLink />
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */} 
          <div className="mr-4 flex">
            <Logo />
          </div>

          {/* Navigation Principale (Desktop) */} 
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            {/* Exemple de liens - à remplacer par vos vrais liens */} 
            <Link href="/">Accueil</Link>
            <Link href="/products">Produits</Link>
            <Link href="/about">À Propos</Link>
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

Header.displayName = 'Header';

export { Header };
