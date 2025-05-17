"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

function SubmitLogoutButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("AccountPage.logout"); // Assumera une section 'logout' dans AccountPage.json

  return (
    <Button
      type="submit"
      variant="destructive" // Pourrait être 'destructive' ou 'primary' pour correspondre aux autres
      className="w-full sm:w-auto"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? t("pendingButtonText") : t("buttonText")}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitLogoutButton />
    </form>
  );
}
