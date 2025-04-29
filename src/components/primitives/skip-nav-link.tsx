"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkipNavLinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  contentId?: string;
}

const DEFAULT_CONTENT_ID = "main-content";

const SkipNavLink = React.forwardRef<HTMLAnchorElement, SkipNavLinkProps>(
  ({ className, contentId = DEFAULT_CONTENT_ID, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={`#${contentId}`}
        // Styles pour le rendre visible uniquement au focus
        // sr-only et focus:not-sr-only sont des patterns courants mais peuvent nécessiter
        // une configuration Tailwind spécifique ou des classes CSS personnalisées.
        // Utilisation de classes Tailwind de base pour l'exemple:
        className={cn(
          "absolute left-[-9999px] top-auto z-50 block h-px w-px overflow-hidden",
          "focus:left-auto focus:top-auto focus:z-50 focus:block focus:h-auto focus:w-auto focus:overflow-visible",
          "bg-background p-3 text-foreground",
          className
        )}
        {...props}
      >
        Aller au contenu principal
      </a>
    );
  }
);

SkipNavLink.displayName = "SkipNavLink";

export { SkipNavLink, DEFAULT_CONTENT_ID };
