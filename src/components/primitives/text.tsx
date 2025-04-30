import React from "react";
import { Slot } from "@radix-ui/react-slot"; // Pour la composition
import { cn } from "@/lib/utils";

// TODO: Ajouter des variantes si nécessaire (ex: size='sm', weight='bold')
interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean; // Pour utiliser Slot
  as?: "p" | "span" | "div"; // Balise sémantique
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, as = "p", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : as;
    // Ajout d'une classe de base pour le texte si besoin, ex: 'text-base text-foreground'
    return (
      <Comp ref={ref} className={cn("leading-7", className)} {...props}>
        {children}
      </Comp>
    );
  }
);

Text.displayName = "Text";

export { Text };
