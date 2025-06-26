"use client";

import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { requestPasswordResetAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionState, useEffect, useState } from "react";

function SubmitButton({ text, loadingText }: { text: string; loadingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? loadingText : text}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.ForgotPassword");
  const tGlobal = useTranslations("Global");
  const locale = useLocale();
  const [state, formAction] = useActionState(requestPasswordResetAction, undefined);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setShowSuccessMessage(true);
    }
  }, [state]);

  if (showSuccessMessage) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">{t("successMessage")}</h2>
        <p className="mt-2 text-sm text-gray-600">{t("description")}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-center text-3xl font-extrabold text-gray-900">{t("title")}</h2>
      <p className="mt-2 text-center text-sm text-gray-600">{t("description")}</p>
      <form action={formAction} className="mt-8 space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <div className="-space-y-px rounded-md shadow-sm">
          <div>
            <Label htmlFor="email" className="sr-only">
              {t("emailLabel")}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t("emailLabel")}
            />
            {state?.fieldErrors?.email && (
              <p className="mt-2 text-sm text-red-600">{state.fieldErrors.email.join(", ")}</p>
            )}
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div>
          <SubmitButton text={t("submitButton")} loadingText={tGlobal("loading")} />
        </div>
      </form>
    </div>
  );
}
