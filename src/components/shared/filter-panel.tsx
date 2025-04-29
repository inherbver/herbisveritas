"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Types pour les données de filtres (Exemples)
export interface FilterOption {
  label: string;
  value: string;
  count?: number; // Optionnel: nombre d'éléments correspondants
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface FiltersState {
  categories?: string[];
  price?: PriceRange;
  // Ajoutez d'autres types de filtres ici (marques, tailles, etc.)
}

interface FilterPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  // Données pour remplir les filtres
  availableCategories?: FilterOption[];
  availablePriceRange?: PriceRange; // Min/Max possibles

  // État actuel des filtres (contrôlé par le parent)
  currentFilters: FiltersState;

  // Callback pour notifier les changements
  onFilterChange: (newFilters: FiltersState) => void;
}

const FilterPanel = React.forwardRef<HTMLDivElement, FilterPanelProps>(
  (
    {
      className,
      availableCategories = [],
      availablePriceRange = { min: 0, max: 1000 }, // Valeurs par défaut
      currentFilters,
      onFilterChange,
      ...props
    },
    ref
  ) => {
    const t = useTranslations("Filters");

    // Gérer l'état local temporaire pour le slider avant de "valider"
    const [localPrice, setLocalPrice] = useState<PriceRange>(
      currentFilters.price ?? availablePriceRange
    );

    // Mettre à jour le prix local si le prix externe changes
    useEffect(() => {
      setLocalPrice(currentFilters.price ?? availablePriceRange);
    }, [currentFilters.price, availablePriceRange]);

    const handleCategoryChange = (checked: boolean | string, categoryValue: string) => {
      const currentCategories = currentFilters.categories || [];
      let newCategories: string[] | undefined;
      if (checked) {
        newCategories = [...currentCategories, categoryValue];
      } else {
        newCategories = currentCategories.filter((c) => c !== categoryValue);
      }
      // Si la liste est vide, on met undefined pour simplifier les requêtes futures
      onFilterChange({
        ...currentFilters,
        categories: newCategories.length > 0 ? newCategories : undefined,
      });
    };

    const handlePriceChange = (value: number[]) => {
      // Met à jour l'état local pendant le glissement
      setLocalPrice({ min: value[0], max: value[1] });
    };

    const handlePriceCommit = (value: number[]) => {
      // Appelle onFilterChange seulement à la fin du glissement (commit)
      onFilterChange({ ...currentFilters, price: { min: value[0], max: value[1] } });
    };

    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        <Accordion type="multiple" defaultValue={["categories", "price"]}>
          {" "}
          {/* Sections ouvertes par défaut */}
          {/* Section Catégories */}
          {availableCategories.length > 0 && (
            <AccordionItem value="categories">
              <AccordionTrigger className="text-base font-medium">
                {t("categoriesTitle", { defaultValue: "Catégories" })}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {availableCategories.map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.value}`}
                        checked={currentFilters.categories?.includes(category.value)}
                        onCheckedChange={(checked) => handleCategoryChange(checked, category.value)}
                      />
                      <Label
                        htmlFor={`category-${category.value}`}
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {category.label}
                        {category.count != null && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({category.count})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
          {/* Section Prix */}
          <AccordionItem value="price">
            <AccordionTrigger className="text-base font-medium">
              {t("priceTitle", { defaultValue: "Prix" })}
            </AccordionTrigger>
            <AccordionContent className="px-1 pt-2">
              <Slider
                min={availablePriceRange.min}
                max={availablePriceRange.max}
                step={10} // Ajustez le pas
                value={[localPrice.min, localPrice.max]}
                onValueChange={handlePriceChange} // Changement pendant le glissement
                onValueCommit={handlePriceCommit} // Changement à la fin
                minStepsBetweenThumbs={1} // Empêche les pouces de se superposer
                className="mb-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{localPrice.min} €</span>
                <span>{localPrice.max} €</span>
              </div>
            </AccordionContent>
          </AccordionItem>
          {/* Ajoutez d'autres sections de filtres ici (Marques, Tailles, etc.) */}
        </Accordion>

        {/* Optionnel: Bouton pour réinitialiser les filtres */}
        {/* <Button variant="outline" size="sm" onClick={() => onFilterChange({})}>Réinitialiser</Button> */}
      </div>
    );
  }
);

FilterPanel.displayName = "FilterPanel";

export { FilterPanel };
