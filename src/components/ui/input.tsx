import * as React from "react";

import { cn } from "@/utils/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Auto-configure inputMode based on type for better mobile experience
  const getInputMode = (inputType?: string) => {
    switch (inputType) {
      case "email":
        return "email";
      case "tel":
        return "tel";
      case "number":
        return "numeric";
      case "url":
        return "url";
      case "search":
        return "search";
      default:
        return "text";
    }
  };

  const inputMode = props.inputMode || getInputMode(type);

  return (
    <input
      type={type}
      inputMode={inputMode}
      data-slot="input"
      className={cn(
        "border-input shadow-xs flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "dark:border-border/40 dark:placeholder:text-muted-foreground/60 dark:bg-[var(--surface-sunken)]",
        "focus-visible:ring-ring/50 dark:focus-visible:border-primary/60 dark:focus-visible:ring-primary/30 focus-visible:border-ring focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Mobile touch-friendly height
        "min-h-[44px] md:h-9 md:min-h-[36px]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
