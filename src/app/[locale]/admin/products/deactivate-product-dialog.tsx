"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProductStatus } from "@/types/product-filters";
import { updateProductStatus } from "@/actions/productActions";

interface DeactivateProductDialogProps {
  children: React.ReactNode;
  productId: string;
  productName: string;
  currentStatus: ProductStatus;
}

export function DeactivateProductDialog({
  children,
  productId,
  productName,
  currentStatus,
}: DeactivateProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isActive = currentStatus === "active";
  const targetStatus: ProductStatus = isActive ? "inactive" : "active";
  const actionText = isActive ? "désactiver" : "activer";
  const actionTextCapitalized = isActive ? "Désactiver" : "Activer";

  const handleStatusChange = () => {
    startTransition(async () => {
      try {
        const result = await updateProductStatus({ productId, status: targetStatus });

        if (result.success) {
          toast.success(result.data?.message || "Succès");
          setOpen(false);
        } else {
          toast.error(result.error || `Impossible de ${actionText} le produit.`);
        }
      } catch (error) {
        console.error("Error changing product status:", error);
        toast.error(`Une erreur est survenue lors de la modification du statut.`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{actionTextCapitalized} le produit</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir {actionText} le produit "<strong>{productName}</strong>" ?
            <br />
            <br />
            {isActive ? (
              <>
                Le produit sera <strong>masqué de la boutique</strong> mais restera en base de
                données. Les clients ne pourront plus le voir ni l'acheter.
              </>
            ) : (
              <>
                Le produit sera <strong>visible dans la boutique</strong> et disponible à l'achat
                par les clients.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleStatusChange}
            disabled={isPending}
            variant={isActive ? "destructive" : "default"}
          >
            {isPending ? "En cours..." : actionTextCapitalized}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
