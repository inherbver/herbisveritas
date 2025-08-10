import React from "react";
import { cn } from "@/utils/cn";

// Simplifié: retire la prop 'as' pour éviter les problèmes de type avec forwardRef

// La ref est maintenant simplement pour HTMLDivElement
const ListView = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    // Rend toujours une div
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col space-y-4 md:space-y-6",
          // Ajustez l'espacement selon votre design
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ListView.displayName = "ListView";

export { ListView };
