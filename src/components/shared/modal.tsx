"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Pour fermer depuis l'intérieur
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  trigger?: React.ReactNode; // Élément qui déclenche l'ouverture
  open?: boolean; // Contrôle externe de l'ouverture
  onOpenChange?: (open: boolean) => void; // Callback pour le changement d'état
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode; // Contenu principal de la modale
  footer?: React.ReactNode; // Contenu du pied de page (boutons d'action)
  contentClassName?: string; // Classe pour personnaliser DialogContent
  size?: "sm" | "md" | "lg" | "xl" | "full"; // Tailles prédéfinies
}

const Modal: React.FC<ModalProps> = ({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  size = "md", // Taille par défaut
}) => {
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    full: "sm:max-w-full h-full sm:h-auto",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn("max-h-[90vh] overflow-y-auto", sizeClasses[size], contentClassName)}
        onOpenAutoFocus={(e) => e.preventDefault()} // Empêche le focus auto sur le premier élément
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="py-4">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

Modal.displayName = "Modal";

// Exporte aussi DialogClose pour pouvoir l'utiliser facilement dans le footer
export { Modal, DialogClose };
