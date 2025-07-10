"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * @description Un bouton qui redirige l'utilisateur vers la page de paiement.
 */
export function CheckoutButton() {
  const t = useTranslations("CartDisplay");

  return (
    <Link href="/checkout" className="w-full" tabIndex={-1}>
      <Button size="lg" className="w-full">
        {t("checkout")}
      </Button>
    </Link>
  );
}
