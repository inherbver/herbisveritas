// src/app/[locale]/test-components-3/page.tsx
"use client"; // Nécessaire car nous utilisons useState et passons un handler

import React, { useState } from "react";
import { CategoryFilter, CategoryOption } from "@/components/domain/shop/category-filter"; // Importe le composant et son type
import { Container } from "@/components/layout"; // Pour un minimum de mise en page
import { ProductGrid, ProductData } from "@/components/domain/shop/product-grid"; // Import ProductGrid and ProductData
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { ProductDetailModal } from "@/components/domain/shop/product-detail-modal"; // Import Modal
import { ProductDetailData } from "@/types/product-types"; // Correct import path

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

// Mock data updated to include fields for ProductDetailData
const mockProducts: (ProductData & Partial<ProductDetailData>)[] = [
  {
    id: "prod-baume-lavande",
    title: "Baume Apaisant à la Lavande",
    subtitle: "Pour peaux sensibles",
    imageSrc: "/assets/images/pdct_1.webp",
    imageAlt: "Baume Apaisant à la Lavande",
    meta: "50 ml",
    price: "25,00 €",
    slug: "baume-lavande",
    // Modal specific data
    properties:
      "Ce baume riche et nourrissant apaise instantanément les peaux sèches et irritées grâce aux propriétés calmantes de la lavande vraie. Idéal après une exposition au soleil ou pour un moment de détente.",
    inci: "Olea Europaea (Olive) Fruit Oil*, Cera Alba (Beeswax)*, Lavandula Angustifolia (Lavender) Oil*, Tocopherol (Vitamin E), Linalool**, Limonene**, Geraniol**. *Ingrédients issus de l'agriculture biologique. **Composants naturels des huiles essentielles.",
    usageInstructions:
      "Appliquer une petite quantité sur la zone concernée et masser doucement jusqu'à absorption complète. Renouveler l'application si nécessaire.",
  },
  {
    id: "prod-huile-tea-tree",
    title: "Huile Essentielle de Tea Tree",
    imageSrc: "/assets/images/pdct_2.webp",
    imageAlt: "Huile Essentielle de Tea Tree",
    meta: "10 ml",
    price: "12,50 €",
    discountPercent: 10,
    slug: "huile-tea-tree",
    // Modal specific data
    properties:
      "Reconnue pour ses puissantes propriétés purifiantes et assainissantes, l'huile essentielle de Tea Tree est un indispensable pour les petits bobos cutanés et pour assainir l'air.",
    inci: "Melaleuca Alternifolia (Tea Tree) Leaf Oil*, Limonene**, Linalool**. *Ingrédients issus de l'agriculture biologique. **Composants naturels des huiles essentielles.",
    usageInstructions:
      "Pour usage cutané : 1 goutte diluée dans une huile végétale sur la zone concernée. Pour diffusion : quelques gouttes dans un diffuseur adapté. Ne pas ingérer. Tenir hors de portée des enfants.",
  },
  {
    id: "prod-encens-sauge",
    title: "Encens Purifiant Sauge Blanche",
    imageSrc: "/assets/images/pdct_3.webp",
    imageAlt: "Encens Purifiant Sauge Blanche",
    meta: "Boîte de 20 bâtons",
    price: "8,00 €",
    isOutOfStock: true,
    slug: "encens-sauge",
    // Modal specific data
    properties:
      "Utilisée traditionnellement pour purifier les lieux et les esprits, la sauge blanche aide à éliminer les énergies négatives et à favoriser la clarté mentale.",
    inci: "Salvia Apiana (White Sage) Leaves",
    usageInstructions:
      "Allumer l'extrémité du bâton d'encens, laisser brûler quelques secondes puis souffler la flamme. Laisser la fumée se diffuser dans la pièce. Utiliser un support résistant à la chaleur. Ventiler après usage.",
  },
  {
    id: "prod-savon-calendula",
    title: "Savon Doux au Calendula",
    subtitle: "Hydratant et calmant",
    imageSrc: "/assets/images/pdct_4.webp", // Use another image
    imageAlt: "Savon Doux au Calendula",
    meta: "100 g",
    price: "9,90 €",
    slug: "savon-calendula",
    // Modal specific data
    properties:
      "Enrichi en macérat huileux de calendula bio, ce savon surgras nettoie la peau tout en douceur, préservant son hydratation naturelle. Convient aux peaux les plus délicates.",
    inci: "Sodium Olivate*, Sodium Cocoate*, Aqua (Water), Glycerin*, Calendula Officinalis Flower Extract*, Olea Europaea (Olive) Fruit Oil*, Cocos Nucifera (Coconut) Oil*. *Ingrédients issus de l'agriculture biologique.",
    usageInstructions:
      "Faire mousser sur peau humide puis rincer abondamment. Peut être utilisé pour le corps et le visage. Éviter le contact avec les yeux.",
  },
];

export default function TestComponentsPage3() {
  const t = useTranslations("TestPage"); // Espace de noms pour cette page
  const [selectedCats, setSelectedCats] = useState<string[]>(["huiles"]); // Exemple: 'huiles' est sélectionné par défaut
  const [isLoadingProducts, setIsLoadingProducts] = useState(false); // Set to true to test skeleton
  const [selectedProduct, setSelectedProduct] = useState<ProductDetailData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFilterChange = (newSelection: string[]) => {
    setSelectedCats(newSelection);
    setIsLoadingProducts(true);
    setTimeout(() => {
      setIsLoadingProducts(false);
    }, 1500); // Simulate network delay
  };

  // Handler for AddToCart button (updated for quantity)
  const handleAddToCart = (productId: string | number, quantity: number = 1) => {
    const product = mockProducts.find((p) => p.id === productId);
    alert(`Ajouté au panier : ${quantity} x ${product?.title || "Produit inconnu"}`); // Simple alert for now
    // Close modal if it was open when adding from modal
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  // Handler for viewing product details
  const handleViewDetails = (productId: string | number) => {
    const product = mockProducts.find((p) => p.id === productId);
    if (product) {
      // Ensure the found product matches the ProductDetailData structure
      // For mock data, we assume it does after updating the mockProducts array
      setSelectedProduct(product as ProductDetailData);
      setIsModalOpen(true);
    }
  };

  // Handler for closing the modal
  const handleModalClose = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
    if (!isOpen) {
      setSelectedProduct(null); // Clear selected product when closing
    }
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
          products={mockProducts.map((product) => ({
            ...product,
            href: {
              pathname: "/product/[slug]", // Correct canonical path pattern with placeholder
              params: { slug: product.slug ?? "" }, // Actual slug parameter
            },
            // Provide the callback handlers expected by ProductCard
          }))}
          isLoading={isLoadingProducts} // Pass the loading state
          onAddToCart={handleAddToCart} // Pass the handler
          onViewDetails={handleViewDetails} // Pass the new view details handler
          // loadingSkeletons={4} // Optionally override default skeletons
        />
      </section>
      {/* Render the ProductDetailModal */}
      <ProductDetailModal
        product={selectedProduct} // Pass the selected product data
        isOpen={isModalOpen} // Control visibility with state
        onOpenChange={handleModalClose} // Handler for closing the modal
        onAddToCart={handleAddToCart} // Pass the add to cart handler (which now accepts quantity)
      />
    </Container>
  );
}
