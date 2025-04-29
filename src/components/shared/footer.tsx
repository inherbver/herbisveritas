import React from "react";
import { Logo, Link, Text } from "@/components/primitives"; // Import des primitifs
import { cn } from "@/lib/utils";

const Footer = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    const currentYear = new Date().getFullYear();

    return (
      <footer ref={ref} className={cn("bg-muted/40 border-t", className)} {...props}>
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Logo />
            <Text
              as="p"
              className="text-center text-sm leading-loose text-muted-foreground md:text-left"
            >
              {currentYear} Inherbis. Tous droits réservés.
            </Text>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground md:justify-end">
            <Link href={{ pathname: "/privacy" }}>Politique de confidentialité</Link>
            <Link href={{ pathname: "/terms" }}>Conditions d'utilisation</Link>
            <Link href={{ pathname: "/legal" }}>Mentions Légales</Link>
            {/* Ajouter d'autres liens ici... */}
          </nav>
        </div>
      </footer>
    );
  }
);

Footer.displayName = "Footer";

export { Footer };
