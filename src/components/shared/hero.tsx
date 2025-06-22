import React from "react";
import { Heading, Text } from "@/components/primitives";
import { Link } from "@/i18n/navigation"; // Import Link
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button"; // Importe aussi les variantes pour les liens stylisés en bouton

// Renomme 'title' en 'heading' pour éviter le conflit
// Define a type for valid pathnames based on the navigation config

export interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: React.ReactNode; // Renommé depuis 'title'
  description?: React.ReactNode;
  imageUrl?: string; // Optionnel: URL pour une image de fond
  imageAlt?: string; // Optionnel: Texte alternatif pour l'image de fond
  ctaLabel?: string; // Label pour le bouton d'appel à l'action
  ctaLink?: React.ComponentProps<typeof import("@/i18n/navigation").Link>["href"]; // Only allow Link's href type
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
      imageAlt, // Destructure imageAlt here
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
          "bg-muted/30 relative flex flex-col justify-start overflow-hidden md:items-start md:pt-24", // Point 3: Desktop top space, Point 5: flex-col for mobile
          "min-h-[450px] py-16 sm:min-h-[500px] sm:py-20 md:h-[60vh] md:max-h-[550px] md:py-0", // Point 3: Height limit
          imageUrl && "bg-cover bg-center bg-no-repeat text-primary-foreground", // Keep existing image logic
          "transition-transform duration-300 ease-in-out hover:scale-[1.02]", // Point 4: Subtle scale animation
          className
        )}
        style={backgroundStyle}
        aria-label={imageUrl && imageAlt ? imageAlt : undefined} // Point 5: Accessibility
        {...props}
      >
        {/* Overlay: Gradient from bottom to center */}
        {imageUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent"
          />
        )}

        {/* Content Wrapper */}
        <header
          className={cn(
            "container relative z-10 mx-auto flex w-full flex-col items-center text-center",
            "px-6 sm:px-8 md:px-10 lg:px-16",
            "pt-[25vh] sm:pt-[20vh] md:max-w-[700px] md:pt-0" // Position text block at ~40% height
          )}
        >
          <Heading
            level={1}
            className={cn(
              "text-4xl font-bold leading-tight drop-shadow-lg sm:text-5xl md:text-5xl lg:text-6xl",
              imageUrl ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {heading}
          </Heading>
          {description && (
            <Text
              className={cn(
                "mt-4 max-w-prose text-base font-medium sm:mt-5 sm:text-lg md:text-xl",
                imageUrl ? "text-primary-foreground/90" : "text-muted-foreground"
              )}
            >
              {description}
            </Text>
          )}
          {ctaLabel && ctaLink && (
            <div className="mt-8 flex justify-center sm:mt-10">
              <Link
                href={ctaLink}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "rounded-lg shadow-md", // CTA rounding and shadow
                  "px-12 py-3 text-base font-semibold",
                  "md:px-14 md:py-3.5 md:text-lg",
                  "hover:ring-secondary-foreground/50 transition-transform duration-200 ease-out hover:scale-105 hover:ring-2" // CTA hover effects
                )}
              >
                {ctaLabel}
              </Link>
            </div>
          )}
        </header>
      </section>
    );
  }
);

Hero.displayName = "Hero";

export { Hero };
