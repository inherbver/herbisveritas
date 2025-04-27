import React from 'react';
import Link from 'next/link'; // Utilise notre Link primitif si déjà créé, sinon next/link
import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  // Props spécifiques si nécessaire (ex: taille, variante)
}

const Logo = React.forwardRef<HTMLAnchorElement, LogoProps>(
  ({ className, ...props }, ref) => {
    return (
      <Link
        href="/"
        ref={ref}
        className={cn('inline-block font-bold text-lg', className)} // Styles de base
        aria-label="Retour à l'accueil"
        {...props}
      >
        {/* Remplacez ceci par votre SVG ou <img> */}
        <span>🌿 Inherbis</span> 
      </Link>
    );
  }
);

Logo.displayName = 'Logo';

export { Logo };
