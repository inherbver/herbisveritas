"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type ProductWithTranslations } from "@/lib/supabase/queries/products";
import { DeleteProductDialog } from "./delete-product-dialog";

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
      const defaultTranslation = product.product_translations?.find(t => t.locale === 'fr') || product.product_translations?.[0];
      return defaultTranslation?.name || product.name || "N/A";
    }
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
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
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
            <DropdownMenuItem>Modifier</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>Copier l'ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteProductDialog productId={product.id} productName={product.name || 'ce produit'}>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()} // Prevent dropdown from closing
                className="text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                Supprimer
              </DropdownMenuItem>
            </DeleteProductDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
