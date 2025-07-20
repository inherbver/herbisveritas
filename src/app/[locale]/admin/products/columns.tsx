"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ProductWithTranslations } from "@/lib/supabase/queries/products";
import { Database } from "@/types/supabase";
import { DeleteProductDialog } from "./delete-product-dialog";
import { DeactivateProductDialog } from "./deactivate-product-dialog";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ProductStatus } from "@/types/product-filters";
import { PRODUCT_STATUS_GROUPS } from "@/types/product-filters";

// Badge de statut réutilisable
function StatusBadge({ status }: { status: ProductStatus }) {
  const statusGroup = PRODUCT_STATUS_GROUPS.find((s) => s.id === status);
  if (!statusGroup) return <span className="text-xs text-muted-foreground">Inconnu</span>;

  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge variant="outline" className={colorClasses[statusGroup.color]}>
      {statusGroup.label}
    </Badge>
  );
}

// Composant séparé pour les actions
function ProductActions({ product }: { product: ProductWithTranslations }) {
  const locale = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/products/${product.slug}`}>Voir le produit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/admin/products/${product.id}/edit`}>Modifier</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DeactivateProductDialog
          productId={product.id}
          productName={product.name || "ce produit"}
          currentStatus={product.status as ProductStatus}
        >
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="text-orange-600 focus:bg-orange-50 focus:text-orange-700"
          >
            {product.status === "active" ? "Désactiver" : "Activer"}
          </DropdownMenuItem>
        </DeactivateProductDialog>
        <DeleteProductDialog productId={product.id} productName={product.name || "ce produit"}>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            Supprimer
          </DropdownMenuItem>
        </DeleteProductDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<ProductWithTranslations>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Nom (par défaut)",
    cell: ({ row }) => {
      // Display the name from the first translation, or the root name if none
      const product = row.original;
      const defaultTranslation =
        product.product_translations?.find(
          (t: Database["public"]["Tables"]["product_translations"]["Row"]) => t.locale === "fr"
        ) || product.product_translations?.[0];
      return defaultTranslation?.name || product.name || "N/A";
    },
  },
  {
    accessorKey: "price",
    header: "Prix",
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(price);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "stock",
    header: "Stock",
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const status = row.getValue("status") as ProductStatus;
      return <StatusBadge status={status} />;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      return <ProductActions product={product} />;
    },
  },
];
