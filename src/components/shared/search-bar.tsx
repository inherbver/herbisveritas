"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl"; // Pour le placeholder et l'aria-label
import { useRouter } from "@/i18n/navigation"; // Pour rediriger vers la page de résultats

interface SearchBarProps extends React.FormHTMLAttributes<HTMLFormElement> {
  // Optionnel: Callback si on veut gérer la recherche autrement qu'en redirigeant
  onSearchSubmit?: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
}

const SearchBar = React.forwardRef<HTMLFormElement, SearchBarProps>(
  ({ className, onSearchSubmit, initialQuery = "", placeholder, ...props }, ref) => {
    const t = useTranslations("SearchBar"); // Assurez-vous d'avoir ces clés dans vos fichiers messages
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);

    const defaultPlaceholder =
      placeholder ?? t("placeholder", { defaultValue: "Rechercher des produits..." });
    const searchLabel = t("searchButtonLabel", { defaultValue: "Rechercher" });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return; // Ne rien faire si la recherche est vide

      if (onSearchSubmit) {
        onSearchSubmit(trimmedQuery);
      } else {
        // Comportement par défaut: rediriger vers une page de recherche
        router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      }
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={cn("relative flex w-full items-center", className)}
        role="search"
        {...props}
      >
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={defaultPlaceholder}
          className="pr-12" // Laisse de la place pour le bouton
          aria-label={defaultPlaceholder}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
          aria-label={searchLabel}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
      </form>
    );
  }
);

SearchBar.displayName = "SearchBar";

export { SearchBar };
