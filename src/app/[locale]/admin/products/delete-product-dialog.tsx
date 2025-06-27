'use client';

import { useState, useTransition, ReactNode } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteProduct } from '@/actions/productActions';

interface DeleteProductDialogProps {
  productId: string;
  productName: string;
  children: ReactNode; // The trigger element, e.g., a DropdownMenuItem
}

export function DeleteProductDialog({ productId, productName, children }: DeleteProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.success) {
        toast.success(result.message);
        setIsOpen(false); // Close the dialog on success
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce produit ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le produit "<strong>{productName}</strong>" sera définitivement supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
