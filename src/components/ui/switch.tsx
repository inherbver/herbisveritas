"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/utils/cn";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base: taille et forme optimisées
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2",
        // États: éteint très visible avec ombre interne, allumé avec couleur primaire
        "data-[state=unchecked]:border-border/60 data-[state=checked]:border-transparent",
        "data-[state=unchecked]:bg-secondary data-[state=checked]:bg-primary",
        "data-[state=unchecked]:shadow-inner data-[state=checked]:shadow-none",
        "dark:data-[state=unchecked]:bg-secondary dark:data-[state=checked]:bg-primary",
        // Animation de transition fluide et responsive
        "transition-all duration-300 ease-in-out",
        // Focus et accessibilité améliorés
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
        // États disabled avec feedback visuel clair
        "disabled:cursor-not-allowed disabled:opacity-60",
        // Hover pour feedback interactif
        "hover:data-[state=unchecked]:bg-secondary/80 hover:data-[state=checked]:bg-primary/90",
        "dark:hover:data-[state=unchecked]:bg-secondary/80 dark:hover:data-[state=checked]:bg-primary/80",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Thumb: design cohérent avec ombre plus marquée pour visibilité
          "pointer-events-none block size-4 rounded-full bg-background shadow-md border border-border/20",
          // Animation de translation fluide et responsive
          "transition-all duration-300 ease-in-out ring-0",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
          // Couleurs adaptées au mode sombre avec meilleur contraste
          "dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-background",
          "dark:border-border/40",
          // Micro-interaction: légère mise à l'échelle au hover
          "hover:scale-105 transition-transform",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
