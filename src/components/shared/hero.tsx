import React from 'react';
import { Heading, Text } from '@/components/primitives';
import { Button, buttonVariants } from '@/components/ui/button'; // Importe aussi les variantes pour les liens stylisés en bouton
import { Link } from '@/i18n/navigation'; // Utilise le Link localisé
import { cn } from '@/lib/utils';

// Renomme 'title' en 'heading' pour éviter le conflit
interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: React.ReactNode; // Renommé depuis 'title'
  description?: React.ReactNode;
  imageUrl?: string; // Optionnel: URL pour une image de fond
  ctaLabel?: string; // Label pour le bouton d'appel à l'action
  ctaHref?: string; // Lien pour le bouton
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  (
    {
      className,
      heading, // Utilise la prop renommée
      description,
      imageUrl,
      ctaLabel,
      ctaHref,
      style,
      ...props
    },
    ref
  ) => {
    const backgroundStyle = imageUrl
      ? { backgroundImage: `url(${imageUrl})`, ...style }
      : style;

    return (
      <section
        ref={ref}
        className={cn(
          'relative flex min-h-[300px] items-center justify-center overflow-hidden bg-muted/30 py-12 md:min-h-[400px] md:py-20',
          imageUrl && 'bg-cover bg-center bg-no-repeat text-primary-foreground',
          className
        )}
        style={backgroundStyle}
        {...props}
      >
        {/* Superposition optionnelle pour améliorer la lisibilité sur image */} 
        {imageUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent md:bg-gradient-to-r md:from-black/70 md:to-transparent"
          />
        )}

        <div className="container relative z-10 max-w-3xl text-center">
          <Heading level={1} className={cn(imageUrl && 'text-inherit')}>
            {heading} {/* Utilise la prop renommée */} 
          </Heading>
          {description && (
            <Text
              className={cn(
                'mt-4 text-lg text-muted-foreground',
                imageUrl && 'text-primary-foreground/90'
              )}
            >
              {description}
            </Text>
          )}
          {ctaLabel && ctaHref && (
            <div className="mt-8">
              <Link
                href={ctaHref}
                className={cn(
                  buttonVariants({ size: 'lg' }), // Style comme un bouton
                  imageUrl &&
                    'border-primary-foreground/50 bg-primary-foreground text-background hover:bg-primary-foreground/90'
                )}
              >
                {ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }
);

Hero.displayName = 'Hero';

export { Hero };
