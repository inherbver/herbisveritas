"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  // SheetClose, // Optionnel, pour un bouton de fermeture explicite à l'intérieur
  // SheetFooter,      // Si nécessaire
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBagIcon } from "lucide-react";
import useCartStore, { selectCartTotalItems } from "@/stores/cartStore";
import { CartDisplay } from "./cart-display"; // Assurez-vous que le chemin est correct
import { cn } from "@/lib/utils";

export function CartSheet() {
  const t = useTranslations("CartSheet"); // Pour les textes comme le titre du sheet
  const tGlobal = useTranslations("Global"); // Pour les textes globaux comme "Panier"
  const totalItems = useCartStore(selectCartTotalItems);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClose = () => setIsOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingBagIcon className="h-5 w-5" />
          {totalItems > 0 && (
            <span
              className={cn(
                "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground",
                "animate-in fade-in zoom-in duration-300"
              )}
              aria-label={tGlobal("itemCount", { count: totalItems })}
            >
              {totalItems}
            </span>
          )}
          <span className="sr-only">{tGlobal("openCart")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>{t("yourCartTitle")}</SheetTitle>
          {/* TODO: S'assurer que le texte de description est pertinent et traduit */}
          <SheetDescription>{t("cartDescription")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <CartDisplay onClose={handleClose} />
        </div>
        {/* Vous pourriez ajouter un SheetFooter ici avec un bouton de checkout plus proéminent si nécessaire */}
        {/* <SheetFooter className="p-6 pt-4 border-t">
          <Button size="lg" className="w-full">{tGlobal('checkout')}</Button>
        </SheetFooter> */}
      </SheetContent>
    </Sheet>
  );
}
