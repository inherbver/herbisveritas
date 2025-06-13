import React from "react";
import { Heading, Text } from "@/components/primitives";
import { Link } from "@/i18n/navigation"; // Import Link
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button"; // Importe aussi les variantes pour les liens stylisés en bouton

// Renomme 'title' en 'heading' pour éviter le conflit
// Define a type for valid pathnames based on the navigation config

interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
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
          "bg-muted/30 relative flex flex-col justify-start overflow-hidden md:justify-center", // Changed to flex-col, justify-start for more control, md:justify-center to attempt original centering for larger adjustments
          "min-h-[450px] py-16 sm:min-h-[500px] sm:py-20 md:min-h-[600px] md:py-24", // Increased min-height and padding
          imageUrl && "bg-cover bg-center bg-no-repeat text-primary-foreground",
          className
        )}
        style={backgroundStyle}
        aria-label={imageUrl && imageAlt ? imageAlt : undefined}
        {...props}
      >
        {/* V1 Overlay: Dark overlay + bottom gradient */}
        {imageUrl && <div aria-hidden="true" className="absolute inset-0 bg-black/40" />}
        {imageUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" // Gradient from top (transparent) to bottom (semi-opaque black)
          />
        )}

        {/* Content Wrapper: controls max-width, centering, and vertical positioning */}
        <header
          className={cn(
            "container relative z-10 mx-auto flex w-full flex-col items-center text-center",
            "px-4 sm:px-6 lg:px-8",
            "mt-[20vh] sm:mt-[18vh] md:mt-0 md:max-w-[600px]" // Desktop: centered (mt-0 because section is justify-center), max-width 600px. Mobile: top margin based on viewport height, full width for text centering
          )}
        >
          <Heading
            level={1}
            className={cn(
              "text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl", // V1: Increased size, font-bold (700). Base: 2.5rem, SM: 3rem, MD: 3.75rem (for 4rem target), LG: 4.5rem
              imageUrl ? "text-inherit" : "text-foreground" // Ensure text color is appropriate
            )}
          >
            {heading}
          </Heading>
          {description && (
            <Text
              className={cn(
                "mt-4 max-w-prose text-base font-medium sm:mt-5 sm:text-lg md:text-xl", // V1: font-medium (500), adjusted margin, responsive text size
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
                  buttonVariants({ variant: "default", size: "lg" }),
                  "px-8 py-3 text-base font-semibold md:px-10 md:py-4 md:text-lg" // Ensure button is substantial
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
