import * as React from "react";

import { cn } from "@/utils/cn";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Base: hiérarchie visuelle claire avec fond contrasté et contours subtils
        "flex flex-col gap-6 rounded-xl border bg-card py-8 px-6 text-card-foreground",
        // Ombres douces pour la profondeur
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        // Feedback visuel: hover avec élévation subtile
        "hover:bg-card/80 hover:-translate-y-0.5 transition-all duration-200 ease-out",
        // Mode sombre optimisé
        "dark:border-border/50 dark:bg-[var(--surface-elevated)] dark:shadow-lg dark:shadow-black/20",
        "dark:hover:bg-[var(--surface-elevated)]/90 dark:hover:shadow-xl dark:hover:shadow-black/30",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Espacement cohérent avec respiration améliorée
        "@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-3 mb-2",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        // Hiérarchie typographique: titre gras niveau 1
        "text-lg font-semibold leading-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        // Hiérarchie typographique: description atténuée niveau 2
        "text-sm text-muted-foreground leading-relaxed mt-1",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        // Espacement constant et respiration améliorée
        "space-y-4",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Espacement cohérent et alignement optimisé
        "[.border-t]:pt-6 flex items-center justify-between mt-6 pt-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
