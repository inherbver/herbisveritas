import React from "react";
import { cn } from "@/lib/utils"; // Assurez-vous que ce chemin est correct

// TODO: Affiner les styles et variantes si nécessaire (ex: tailles différentes)
const headingVariants = {
  1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl font-serif",
  2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 font-serif",
  3: "scroll-m-20 text-2xl font-semibold tracking-tight font-serif",
  4: "scroll-m-20 text-xl font-semibold tracking-tight font-serif",
  // Ajoutez h5, h6 si nécessaire
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4; // Niveaux de titre supportés
  as?: "h1" | "h2" | "h3" | "h4"; // Permet de spécifier la balise sémantique
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level, as, className, children, ...props }, ref) => {
    const Tag = as || `h${level}`;
    const variantClass = headingVariants[level] || headingVariants[3]; // Fallback au niveau 3

    return (
      <Tag ref={ref} className={cn(variantClass, className)} {...props}>
        {children}
      </Tag>
    );
  }
);

Heading.displayName = "Heading";

export { Heading };
