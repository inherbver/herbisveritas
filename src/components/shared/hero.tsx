import React from "react";
import { Heading, Text } from "@/components/primitives";
import { Link, pathnames } from "@/i18n/navigation"; // Import Link AND pathnames
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button"; // Importe aussi les variantes pour les liens stylisés en bouton

// Renomme 'title' en 'heading' pour éviter le conflit
// Define a type for valid pathnames based on the navigation config
type AppPathname = keyof typeof pathnames;

interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: React.ReactNode; // Renommé depuis 'title'
  description?: React.ReactNode;
  imageUrl?: string; // Optionnel: URL pour une image de fond
  ctaLabel?: string; // Label pour le bouton d'appel à l'action
  ctaLink?: AppPathname; // Use the restricted type
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  (
    {
      className,
      heading, // Utilise la prop renommée
      description,
      imageUrl,
      ctaLabel,
      ctaLink,
      style,
      ...props
    },
    ref
  ) => {
    const backgroundStyle = imageUrl ? { backgroundImage: `url(${imageUrl})`, ...style } : style;

    return (
      <section
        ref={ref}
        className={cn(
          "bg-muted/30 relative flex min-h-[300px] items-center justify-center overflow-hidden py-12 md:min-h-[400px] md:py-20",
          imageUrl && "bg-cover bg-center bg-no-repeat text-primary-foreground",
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
          <Heading level={1} className={cn(imageUrl && "text-inherit")}>
            {heading} {/* Utilise la prop renommée */}
          </Heading>
          {description && (
            <Text
              className={cn(
                "mt-4 text-lg text-muted-foreground",
                imageUrl && "text-primary-foreground/90"
              )}
            >
              {description}
            </Text>
          )}
          {ctaLabel && ctaLink && (
            <div className="mt-6 flex items-center gap-x-6">
              <Link
                href={{ pathname: ctaLink }} // Use object syntax
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
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

Hero.displayName = "Hero";

export { Hero };
