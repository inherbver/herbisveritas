import React from "react";
import { Heading, Text } from "@/components/common";
import { Link } from "@/i18n/navigation";
import { cn } from "@/utils/cn";
import { ChevronDownIcon } from "lucide-react";

export interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: React.ReactNode;
  description?: React.ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  ctaLabel?: string;
  ctaLink?: React.ComponentProps<typeof Link>["href"];
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  (
    { className, heading, description, imageUrl, ctaLabel, ctaLink, imageAlt, style, ...props },
    ref
  ) => {
    const backgroundStyle = imageUrl ? { backgroundImage: `url(${imageUrl})`, ...style } : style;

    return (
      <section
        ref={ref}
        className={cn(
          "relative flex items-center justify-center overflow-hidden", // Base container
          "py-24 md:py-32", // Vertical padding
          imageUrl && "bg-cover bg-center bg-no-repeat text-primary-foreground",
          className
        )}
        style={backgroundStyle}
        aria-label={imageUrl && imageAlt ? imageAlt : undefined}
        {...props}
      >
        {/* Overlay for better text contrast */}
        {imageUrl && <div aria-hidden="true" className="absolute inset-0 bg-black/30" />}

        {/* Content Wrapper */}
        <div className="container relative z-10 mx-auto flex flex-col items-center text-center">
          <header className="max-w-3xl">
            <Heading
              level={1}
              className={cn(
                "font-serif text-5xl font-bold tracking-wider drop-shadow-lg md:text-6xl",
                imageUrl ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {heading}
            </Heading>
            {description && (
              <Text
                className={cn(
                  "mx-auto mt-4 max-w-2xl text-lg md:text-xl",
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
                    "inline-block rounded-full bg-secondary px-6 py-3 font-semibold text-secondary-foreground",
                    "transition-all duration-200 ease-out",
                    "hover:scale-105 hover:bg-secondary-foreground hover:text-secondary"
                  )}
                >
                  {ctaLabel}
                </Link>
              </div>
            )}
          </header>
        </div>

        {/* Scroll Down Affordance */}
        {imageUrl && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transform">
            <ChevronDownIcon className="h-8 w-8 animate-bounce text-primary-foreground" />
          </div>
        )}
      </section>
    );
  }
);

Hero.displayName = "Hero";

export { Hero };
