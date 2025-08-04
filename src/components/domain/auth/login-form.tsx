"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthForm } from "@/hooks/useAuthForm";
import { loginAction, resendConfirmationEmailAction } from "@/actions/authActions";
import { createLoginSchema } from "@/lib/validators/auth.validator";
import { toast } from "sonner";
import Link from "next/link";

export function LoginForm() {
  const t = useTranslations("Auth.LoginForm");
  const tValidation = useTranslations("Auth.validation");
  
  // Créer le schéma avec les traductions
  const loginSchema = createLoginSchema(tValidation);
  type LoginFormData = z.infer<typeof loginSchema>;
  
  const { form, state, formAction, isLoading } = useAuthForm<LoginFormData>({
    schema: loginSchema,
    action: loginAction,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleResendEmail = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    
    const result = await resendConfirmationEmailAction(email);
    if (result.success) {
      toast.success(result.message || "Email de confirmation envoyé");
    } else {
      toast.error(result.error || "Erreur lors de l'envoi");
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
      
      <Form {...form}>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {/* Affichage des erreurs générales avec gestion du bouton de renvoi */}
            {state?.error && !state?.fieldErrors && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            
            {/* Affichage du bouton de renvoi d'email si nécessaire */}
            {state?.data?.showResendButton && (
              <Button
                variant="outline"
                type="button"
                onClick={handleResendEmail}
                className="w-full"
                disabled={isLoading}
              >
                {t("resendConfirmationButton")}
              </Button>
            )}
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="m@exemple.com"
                      autoComplete="email"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-right">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("forgotPasswordLink")}
                    </Link>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              size="lg"
              variant="secondary"
              className="w-full shadow-md transition-transform duration-200 ease-in-out active:scale-95 hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? t("loading") : t("submitButton")}
            </Button>
          </CardFooter>
        </form>
      </Form>
      
      <p className="mt-4 px-6 pb-6 text-center text-sm">
        {t("registerPrompt")}{" "}
        <Link
          href="/register"
          className="hover:text-primary/90 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
        >
          {t("registerLink")}
        </Link>
      </p>
    </Card>
  );
}
