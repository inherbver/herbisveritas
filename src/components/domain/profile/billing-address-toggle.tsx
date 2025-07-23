"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { setBillingAddressSameAsShipping } from "@/actions/profileActions";

interface BillingAddressToggleProps {
  initialIsSame: boolean; // true si billing_address_is_different === false
}

export default function BillingAddressToggle({ initialIsSame }: BillingAddressToggleProps) {
  const [isSame, setIsSame] = useState(initialIsSame);
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("AccountPage.addresses");

  const handleToggleChange = (checked: boolean) => {
    setIsSame(checked);

    startTransition(async () => {
      try {
        const result = await setBillingAddressSameAsShipping(checked, locale);

        if (result.success) {
          toast.success(checked ? t("syncSuccess") : t("separateSuccess"));
        } else {
          // Revenir à l'état précédent en cas d'erreur
          setIsSame(!checked);
          toast.error(result.error || t("updateError"));
        }
      } catch (error) {
        // Revenir à l'état précédent en cas d'erreur
        setIsSame(!checked);
        toast.error(t("updateError"));
        console.error("Error updating billing address setting:", error);
      }
    });
  };

  return (
    <div className="mb-4 flex items-center space-x-2">
      <Checkbox
        id="billing-same-as-shipping"
        checked={isSame}
        onCheckedChange={handleToggleChange}
        disabled={isPending}
      />
      <Label htmlFor="billing-same-as-shipping" className="cursor-pointer text-sm font-medium">
        {t("billingSameAsShipping")}
      </Label>
      {isPending && <span className="text-xs text-muted-foreground">{t("updating")}</span>}
    </div>
  );
}
