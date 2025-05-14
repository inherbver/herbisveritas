// src/components/auth/ChangePasswordForm.tsx
"use client";

import { useState, useEffect, useActionState, startTransition } from "react";
import { useFormStatus } from "react-dom";
import { updatePasswordAction } from "@/app/[locale]/profile/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("ChangePasswordForm.SubmitButton");
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? t("pending") : t("idle")}
    </Button>
  );
}

export default function ChangePasswordForm() {
  const t = useTranslations("ChangePasswordForm");

  const initialState = { success: false, message: "" };
  const [state, formAction] = useActionState(updatePasswordAction, initialState);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [prevMessage, setPrevMessage] = useState(initialState.message);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientError(null);

    if (newPassword.length < 8) {
      setClientError(t("validation.minLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError(t("validation.passwordsMustMatch"));
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    if (state.message && state.message !== prevMessage) {
      if (state.success) {
        toast.success(t("notifications.success"));
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(t("notifications.error", { error: state.message }));
      }
      setPrevMessage(state.message);
    }
     
  }, [state, t, prevMessage]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1"
        />
      </div>

      {clientError && <p className="text-sm text-destructive">{clientError}</p>}
      {!state.success && state.message && state.message !== prevMessage && !clientError && (
        <p className="text-sm text-destructive">
          {t("notifications.serverError", { error: state.message })}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
