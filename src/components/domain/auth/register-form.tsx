"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import React from "react";
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
import { signUpAction } from "@/actions/auth";

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
  // État initial pour useActionState
  const initialState = { error: undefined, message: undefined };
  // Utiliser la vraie action signUpAction
  const [state, formAction] = useActionState(signUpAction, initialState);

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
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
          {/* Afficher les erreurs générales */}
          {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
          {/* Afficher les messages de succès (ex: email de confirmation envoyé) */}
          {state?.message && <p className="text-sm font-medium text-green-600">{state.message}</p>}
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
