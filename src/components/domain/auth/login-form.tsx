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
import { loginAction } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth.LoginForm");
  return (
    <Button type="submit" size="sm" className="w-full" disabled={pending}>
      {pending ? t("loading") : t("submitButton")}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations("Auth.LoginForm");
  const initialState = { error: undefined };
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" name="email" type="email" placeholder="m@exemple.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
      <p className="mt-4 px-6 pb-6 text-center text-sm">
        {t("registerPrompt")}{" "}
        <a href="/register" className="underline">
          {t("registerLink")}
        </a>
      </p>
    </Card>
  );
}
