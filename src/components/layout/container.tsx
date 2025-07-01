import React from "react";
import { cn } from "@/utils/cn";

const Container = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Container.displayName = "Container";

export { Container };
