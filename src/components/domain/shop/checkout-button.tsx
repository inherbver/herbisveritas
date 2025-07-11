"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CheckoutButtonProps {
  onClose: () => void;
}

/**
 * @description Un bouton qui ferme le panier, affiche un loader, et redirige vers la page de paiement.
 */
export function CheckoutButton({ onClose }: CheckoutButtonProps) {
  const t = useTranslations("CartDisplay");
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const handleCheckout = () => {
    setIsRedirecting(true);
    onClose(); // Ferme le sheet
    router.push("/checkout");
  };

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleCheckout}
      disabled={isRedirecting}
      aria-disabled={isRedirecting}
    >
      {isRedirecting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : null}
      {t("checkout")}
    </Button>
  );
}
