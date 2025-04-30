import React from "react";
import { cn } from "@/lib/utils";

const Logo = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    return (
      <span ref={ref} className={cn("inline-block text-lg font-bold", className)} {...props}>
        {/* Remplacez ceci par votre SVG ou <img> */}
        <span className={cn("font-bold", className)}>Herbis Veritas</span>
      </span>
    );
  }
);

Logo.displayName = "Logo";

export { Logo };
