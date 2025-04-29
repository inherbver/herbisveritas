import React from "react";
import { cn } from "@/lib/utils";

const CardGrid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4",
          // Ajustez le nombre de colonnes et les gaps selon votre design
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardGrid.displayName = "CardGrid";

export { CardGrid };
