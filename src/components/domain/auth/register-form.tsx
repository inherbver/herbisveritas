"use client";

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import React, { useEffect } from "react"; // Import useEffect
import { toast } from "sonner"; // Import toast from sonner
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type AuthActionResult } from "@/actions/auth"; // Import AuthActionResult

// Composant bouton pour gérer l'état pending
function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth.RegisterForm");
  return (
    <Button type="submit" size="sm" className="w-full" disabled={pending}>
      {pending ? t("loading") : t("submitButton")}
    </Button>
  );
}

export function RegisterForm() {
  const t = useTranslations("Auth.RegisterForm");
  const initialState: AuthActionResult = {
    success: false,
    error: undefined,
    message: undefined,
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(signUpAction, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success && state.message) {
      toast.success(state.message);
    }
  }, [state.error, state.message, state.success]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t("description")}
        </CardDescription>
      </CardHeader>
      {/* Utiliser la vraie formAction */}
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" name="email" type="email" placeholder="nom@exemple.com" required />
            {state.fieldErrors?.email && (
              <p className="text-sm font-medium text-destructive">
                {state.fieldErrors.email.join(", ")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Input id="password" name="password" type="password" required />
            {state.fieldErrors?.password && (
              <p className="text-sm font-medium text-destructive">
                {state.fieldErrors.password.join(", ")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
            {state.fieldErrors?.confirmPassword && (
              <p className="text-sm font-medium text-destructive">
                {state.fieldErrors.confirmPassword.join(", ")}
              </p>
            )}
          </div>
          {/* General error and success messages are now handled by toast */}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
      {/* Optionnel: Lien vers la page de connexion */}
      <p className="mt-4 px-6 pb-6 text-center text-sm">
        {t("loginPrompt")}{" "}
        <a href="/login" className="underline">
          {t("loginLink")}
        </a>
      </p>
    </Card>
  );
}
