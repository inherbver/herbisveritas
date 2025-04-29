import React from "react";
import Link from "next/link"; // Utilise notre Link primitif si déjà créé, sinon next/link
import { cn } from "@/lib/utils";

const Logo = React.forwardRef<
  HTMLAnchorElement,
  React.HTMLAttributes<HTMLAnchorElement> // Revert to Anchor attributes
>(({ className, ...props }, ref) => {
  return (
    <Link
      href="/"
      ref={ref}
      // Styles de base
      className={cn("inline-block text-lg font-bold", className)}
      aria-label="Retour à l'accueil"
      {...props}
      legacyBehavior
    >
      {/* Remplacez ceci par votre SVG ou <img> */}
      <span className={cn("font-bold", className)}>Herbis Veritas</span>
    </Link>
  );
});

Logo.displayName = "Logo";

export { Logo };
