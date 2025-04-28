// src/app/[locale]/test-components-3/page.tsx
"use client"; // Nécessaire car nous utilisons useState et passons un handler

import React, { useState } from "react";
import { CategoryFilter, CategoryOption } from "@/components/domain/shop/category-filter"; // Importe le composant et son type
import { Container } from "@/components/layout"; // Pour un minimum de mise en page
import { ProductGrid, ProductData } from "@/components/domain/shop/product-grid"; // Import ProductGrid and ProductData
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

// Données de test pour les catégories
const testCategories: CategoryOption[] = [
  { label: "Baumes", value: "baumes", count: 5 },
  { label: "Huiles", value: "huiles", count: 12 },
  { label: "Encens", value: "encens" }, // Sans compte
  { label: "Bâtons de fumigation", value: "fumigation", count: 8 },
  { label: "Visage", value: "visage", count: 21 },
  { label: "Corps", value: "corps", count: 15 },
  { label: "Peau sensible", value: "peau-sensible" },
  { label: "Pratiques spirituelles", value: "spirituel", count: 3 },
  // Ajout de quelques catégories supplémentaires pour tester le scroll
  { label: "Cheveux", value: "cheveux", count: 7 },
  { label: "Accessoires", value: "accessoires", count: 10 },
  { label: "Idées Cadeaux", value: "cadeaux", count: 4 },
  { label: "Nouveautés", value: "nouveautes", count: 9 },
];

// Mock data for ProductGrid (Updated: Add 'id' to each product)
const mockProducts: ProductData[] = [
  {
    id: "prod-baume-lavande",
    title: "Baume Apaisant à la Lavande",
    subtitle: "Pour peaux sensibles",
    imageSrc: "/assets/images/pdct_1.webp",
    imageAlt: "Baume Apaisant à la Lavande",
    meta: "50 ml",
    price: "25,00 €",
    href: "/product/baume-lavande",
  },
  {
    id: "prod-huile-tea-tree",
    title: "Huile Essentielle de Tea Tree",
    imageSrc: "/assets/images/pdct_2.webp",
    imageAlt: "Huile Essentielle de Tea Tree",
    meta: "10 ml",
    price: "12,50 €",
    discountPercent: 10,
    badgeSrc: "/images/badges/bio_label.svg", // Keep placeholder for badge for now
    href: "/product/huile-tea-tree",
  },
  {
    id: "prod-encens-sauge",
    title: "Encens Purifiant Sauge Blanche",
    imageSrc: "/assets/images/pdct_3.webp",
    imageAlt: "Encens Purifiant Sauge Blanche",
    meta: "Boîte de 20 bâtons",
    price: "8,00 €",
    isOutOfStock: true,
    href: "/product/encens-sauge",
  },
  // Add one more product to test grid responsiveness better
  {
    id: "prod-savon-calendula",
    title: "Savon Doux au Calendula",
    subtitle: "Hydratant et calmant",
    imageSrc: "/assets/images/pdct_4.webp", // Use another image
    imageAlt: "Savon Doux au Calendula",
    meta: "100 g",
    price: "7,50 €",
    href: "/product/savon-calendula",
  },
];

export default function TestComponentsPage3() {
  const t = useTranslations("TestPage"); // Espace de noms pour cette page
  const [selectedCats, setSelectedCats] = useState<string[]>(["huiles"]); // Exemple: 'huiles' est sélectionné par défaut
  const [isLoadingProducts, setIsLoadingProducts] = useState(false); // Set to true to test skeleton

  const handleFilterChange = (newSelection: string[]) => {
    console.log("Nouvelles catégories sélectionnées:", newSelection); // Log pour le debug
    setSelectedCats(newSelection);
    setIsLoadingProducts(true);
    setTimeout(() => {
      setIsLoadingProducts(false);
    }, 1500); // Simulate network delay
  };

  // Handler for AddToCart button
  const handleAddToCart = (productId: string | number) => {
    const product = mockProducts.find((p) => p.id === productId);
    console.log(`Added product ID "${productId}" (${product?.title}) to cart (simulation)`);
    alert(`Ajouté au panier : ${product?.title || "Produit inconnu"}`); // Simple alert for now
  };

  return (
    <Container className="py-8">
      {" "}
      {/* Utilise le Container pour centrer et ajouter du padding */}
      <h1 className="mb-6 text-2xl font-semibold">{t("title")} - Page 3</h1>{" "}
      {/* Titre spécifique */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-medium">{t("categoryFilterTitle")}</h2>
        <CategoryFilter
          availableCategories={testCategories}
          selectedCategories={selectedCats}
          onCategoryChange={handleFilterChange}
          // triggerLabel="Filtrer les produits" // Label personnalisé optionnel
        />
        <div className="mt-4 text-sm text-muted-foreground">
          {t("selectedCategoriesLabel")}: {selectedCats.join(", ") || t("noneSelected")}
        </div>
      </section>
      <Separator className="my-8" />
      {/* Section for Product Grid */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">{t("productCardTitle")}</h2>
        <ProductGrid
          products={mockProducts} // Pass the mock data with IDs
          isLoading={isLoadingProducts} // Pass the loading state
          onAddToCart={handleAddToCart} // Pass the handler
          // loadingSkeletons={4} // Optionally override default skeletons
        />
      </section>
    </Container>
  );
}

// N'oubliez pas d'ajouter les traductions correspondantes dans vos fichiers JSON (ex: messages/en.json, messages/fr.json)
/* Exemple pour messages/fr.json:
{
  "TestPage": {
    "title": "Page de Test des Composants Métier",
    "categoryFilterTitle": "Test du Filtre par Catégories",
    "selectedCategoriesLabel": "Catégories sélectionnées",
    "noneSelected": "Aucune",
    "productCardTitle": "Test de la Carte de Produit"
  },
  "Filters": {
     "filterByCategory": "Filtrer par catégorie",
     "close": "Fermer",
     "noCategoriesAvailable": "Aucune catégorie disponible pour le moment."
  }
}
*/
