// src/components/domain/shop/category-filter.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area"; // Pour les longues listes
import { Filter } from "lucide-react"; // Icône pour le bouton déclencheur
import { cn } from "@/utils/cn";
import { useTranslations } from "next-intl"; // Optionnel: pour l'internationalisation

// Définit la structure d'une option de catégorie
export interface CategoryOption {
  label: string; // Nom affiché
  value: string; // Identifiant unique
  count?: number; // Optionnel: Nombre de produits dans cette catégorie
}

// Props pour le composant CategoryFilter
interface CategoryFilterProps extends React.HTMLAttributes<HTMLDivElement> {
  availableCategories: CategoryOption[]; // Catégories disponibles
  selectedCategories: string[]; // Valeurs des catégories sélectionnées
  onCategoryChange: (selectedValues: string[]) => void; // Callback lors du changement
  triggerLabel?: string; // Label optionnel pour le bouton déclencheur
}

const CategoryFilter = React.forwardRef<HTMLDivElement, CategoryFilterProps>(
  (
    {
      className,
      availableCategories = [],
      selectedCategories = [],
      onCategoryChange,
      triggerLabel,
      ...props
    },
    ref
  ) => {
    const t = useTranslations("Filters"); // Espace de noms pour les traductions

    // Gère le changement d'état des cases à cocher dans le sheet
    const handleCheckboxChange = (checked: boolean | string, categoryValue: string) => {
      let newSelectedCategories: string[];
      if (checked) {
        // Ajoute la catégorie si cochée
        newSelectedCategories = [...selectedCategories, categoryValue];
      } else {
        // Retire la catégorie si décochée
        newSelectedCategories = selectedCategories.filter((val) => val !== categoryValue);
      }
      // Appelle le callback parent avec les nouvelles sélections
      onCategoryChange(newSelectedCategories);
    };

    // Label par défaut (utilisant les traductions)
    const defaultTriggerLabel = t("filterByCategory");

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {/* Le composant Sheet englobe le déclencheur et le contenu */}
        <Sheet>
          {/* Le bouton qui ouvre le Sheet */}
          <SheetTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {triggerLabel || defaultTriggerLabel}
              {/* Affiche un badge avec le nombre de filtres actifs */}
              {selectedCategories.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {selectedCategories.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          {/* Le contenu du panneau latéral (Sheet) */}
          <SheetContent side="left">
            {" "}
            {/* Peut être 'bottom' pour une approche mobile différente */}
            <SheetHeader>
              <SheetTitle>{t("filterByCategory")}</SheetTitle>
              <SheetDescription>{t("categoryFilterDescription")}</SheetDescription>
            </SheetHeader>
            {/* Zone scrollable pour la liste des catégories */}
            <ScrollArea className="h-[calc(100vh-8rem)] flex-grow">
              {" "}
              {/* Ajuster la hauteur si nécessaire */}
              <div className="grid gap-4 py-4">
                {availableCategories.length > 0 ? (
                  // Affiche chaque catégorie comme une checkbox
                  availableCategories.map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.value}`}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={(checked) => handleCheckboxChange(checked, category.value)}
                      />
                      <Label
                        htmlFor={`category-${category.value}`}
                        className="flex-1 cursor-pointer select-none" // Permet de cliquer sur le label pour cocher/décocher
                      >
                        {category.label}
                        {/* Affiche le compte si disponible */}
                        {category.count !== undefined && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({category.count})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                ) : (
                  // Message si aucune catégorie n'est disponible
                  <p className="text-sm text-muted-foreground">{t("noCategoriesAvailable")}</p>
                )}
              </div>
            </ScrollArea>
            <SheetFooter>
              {/* Bouton pour fermer le Sheet */}
              <SheetClose asChild>
                <Button type="button">{t("close")}</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    );
  }
);

CategoryFilter.displayName = "CategoryFilter";

export { CategoryFilter }; // Exporte le composant
