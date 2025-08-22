import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const buttonVariants = cva(
  // Base: taille uniforme, rayon bordure cohérent, transitions douces
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
  // Transitions et états: amélioration de l'expérience utilisateur
  "transition-all duration-200 ease-out",
  // États: disabled, focus, invalid avec contrastes améliorés
  "disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
  "aria-invalid:ring-2 aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  // Icônes: comportement cohérent
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  // Hover transform subtile pour feedback tactile
  "hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md dark:hover:bg-primary/80 dark:shadow-md dark:shadow-black/20 dark:hover:shadow-lg dark:hover:shadow-black/30",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md dark:hover:bg-primary/80 dark:shadow-md dark:shadow-black/20 dark:hover:shadow-lg dark:hover:shadow-black/30",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/30 dark:focus-visible:ring-destructive/50 dark:bg-destructive/80 dark:hover:bg-destructive/70 dark:shadow-md dark:shadow-black/20",
        outline:
          "border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/40 dark:bg-[var(--surface-base)] dark:border-border/60 dark:hover:bg-[var(--surface-elevated)] dark:hover:border-primary/30",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md dark:hover:bg-secondary/70 dark:shadow-md dark:shadow-black/20 dark:hover:shadow-lg dark:hover:shadow-black/30",
        ghost:
          "hover:bg-accent hover:text-accent-foreground transition-colors dark:hover:bg-[var(--surface-elevated)] dark:hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors dark:text-primary dark:hover:text-primary/80",
        support:
          "bg-support text-support-foreground shadow-sm hover:bg-support/90 hover:shadow-md dark:hover:bg-support/80 dark:shadow-md dark:shadow-black/20 dark:hover:shadow-lg dark:hover:shadow-black/30",
      },
      size: {
        // Tailles uniformes avec padding cohérent et adaptation aux icônes
        default: "h-10 px-4 py-2 min-w-[2.5rem] has-[>svg]:px-3",
        sm: "h-9 px-3 py-1.5 min-w-[2.25rem] has-[>svg]:px-2.5",
        lg: "h-12 px-8 py-3 min-w-[3rem] has-[>svg]:px-6",
        icon: "size-10 p-0",
        "mobile-touch":
          "min-h-[44px] min-w-[44px] px-4 py-2 touch-manipulation transition-transform duration-200 active:scale-95 md:h-10",
        "mobile-icon":
          "min-h-[44px] min-w-[44px] p-0 touch-manipulation transition-transform duration-200 active:scale-95 md:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
