"use client";

import React from "react";
import { Link } from "@/components/primitives";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
// Pourrait utiliser usePathname pour générer les items dynamiquement
// import { usePathname } from '@/i18n/navigation';
// import { useTranslations } from 'next-intl';

export interface BreadcrumbItem {
  label: React.ReactNode; // Peut être une string ou un élément traduit
  href: string;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, items, separator = <ChevronRight className="h-4 w-4" />, ...props }, ref) => {
    // const t = useTranslations('Breadcrumb'); // Pour traduire ex: 'Home'

    if (!items || items.length === 0) {
      return null;
    }

    return (
      <nav
        aria-label="Fil d'Ariane"
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-1.5 break-words sm:gap-2.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="opacity-50">
                    {separator}
                  </span>
                )}
                <Link
                  href={item.href}
                  // Les éléments non actifs (sauf le dernier) sont des liens
                  // Le dernier élément est juste du texte (ou un lien non cliquable)
                  className={cn(
                    "transition-colors hover:text-foreground",
                    isLast && "pointer-events-none font-medium text-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = "Breadcrumb";

export { Breadcrumb };
