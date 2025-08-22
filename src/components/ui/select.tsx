"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/utils/cn";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Base: structure et dimensionnement optimisés
        "flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm",
        "data-[size=default]:h-10 data-[size=sm]:h-9",
        // Bordure visible et design amélioré
        "border-2 border-border/60 bg-background shadow-sm",
        "dark:bg-input/30 dark:border-border/40",
        // États interactifs avec transitions fluides
        "hover:border-border hover:bg-accent/50 transition-all duration-200",
        "dark:hover:bg-input/50 dark:hover:border-border/60",
        // Focus avec contraste amélioré
        "outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // États d'erreur
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        "dark:aria-invalid:ring-destructive/40",
        // États disabled
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
        // Placeholder et contenu
        "data-[placeholder]:text-muted-foreground",
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex",
        "*:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        // Icônes: taille et couleur cohérentes
        "[&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          // Base: dimensionnement et positionnement optimisés
          "max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin)",
          "relative z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden",
          // Design: bordure visible, contraste amélioré, ombre douce
          "rounded-lg border-2 border-border/60 bg-popover text-popover-foreground",
          "shadow-lg backdrop-blur-sm",
          // Mode sombre: amélioration du contraste
          "dark:border-border/40 dark:bg-popover/95 dark:shadow-xl dark:shadow-black/20",
          // Animations fluides et naturelles
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          // Position popper avec ajustements subtils
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-2",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        // Labels: typographie et espacement cohérents avec dropdown
        "px-3 py-2 text-sm font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Base: structure et espacement optimisés pour les éléments de sélection
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-2 pl-3 pr-8 text-sm",
        "outline-none transition-colors duration-150",
        // États: sélection avec contraste amélioré
        "focus:bg-accent/80 focus:text-accent-foreground hover:bg-accent/60",
        // États disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-60",
        // Organisation du contenu avec spans
        "*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        // Icônes: taille et couleur cohérentes
        "[&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        // Séparateur: cohérence avec dropdown, visibilité améliorée
        "pointer-events-none -mx-1 my-2 h-px bg-border/80 dark:bg-border/60",
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
