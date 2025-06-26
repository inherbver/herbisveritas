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
import { loginAction, resendConfirmationEmailAction, type AuthActionResult } from "@/actions/auth"; // Import AuthActionResult

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth.LoginForm");
  return (
    <Button
      type="submit"
      size="lg"
      variant="secondary"
      className="w-full shadow-md transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95"
      disabled={pending}
    >
      {pending ? t("loading") : t("submitButton")}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations("Auth.LoginForm");
  const initialState: AuthActionResult = {
    success: false,
    error: undefined,
    message: undefined,
    fieldErrors: {},
  };
  const [state, formAction] = useActionState(loginAction, initialState);
  const [email, setEmail] = React.useState("");

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success && state.message) {
      toast.success(state.message);
    }
  }, [state]);

  const handleResendEmail = async () => {
    const result = await resendConfirmationEmailAction(email);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Card className="border-border/50 w-full max-w-sm rounded-xl shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">{t("title")}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@exemple.com"
              required
              onChange={(e) => setEmail(e.target.value)}
              value={email}
            />
            {state.fieldErrors?.email && (
              <p className="text-sm font-medium text-destructive">
                {state.fieldErrors.email.join(", ")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Input id="password" name="password" type="password" required />
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("forgotPasswordLink")}
              </a>
            </div>
            {state.fieldErrors?.password && (
              <p className="text-sm font-medium text-destructive">
                {state.fieldErrors.password.join(", ")}
              </p>
            )}
          </div>
          {/* General form error message is now handled by toast */}
        </CardContent>
        <CardFooter className="flex-col">
          {state.error?.includes("Email non confirmé") && (
            <Button
              variant="outline"
              type="button"
              onClick={handleResendEmail}
              className="mb-4 w-full"
            >
              {t("resendConfirmationButton")}
            </Button>
          )}
          <div className="mt-6 w-full">
            <SubmitButton />
          </div>
        </CardFooter>
      </form>
      <p className="mt-4 px-6 pb-6 text-center text-sm">
        {t("registerPrompt")}{" "}
        <a
          href="/register"
          className="hover:text-primary/90 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
        >
          {t("registerLink")}
        </a>
      </p>
    </Card>
  );
}
