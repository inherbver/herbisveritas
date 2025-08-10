import React from "react";
import { cn } from "@/utils/cn";
import { DEFAULT_CONTENT_ID } from "./skip-nav-link"; // Importe l'ID par défaut

interface SkipNavTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
}

const SkipNavTarget = React.forwardRef<HTMLDivElement, SkipNavTargetProps>(
  ({ className, id = DEFAULT_CONTENT_ID, ...props }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        // Ajoute un tabindex="-1" pour s'assurer qu'il peut recevoir le focus programmatique,
        // mais ne pas être dans l'ordre de tabulation normal.
        // L'outline est retiré car l'élément n'est pas censé être visible.
        className={cn("outline-none", className)}
        tabIndex={-1}
        {...props}
      />
    );
  }
);

SkipNavTarget.displayName = "SkipNavTarget";

export { SkipNavTarget };
