"use client";

import { useState, useEffect } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthForm } from "@/hooks/useAuthForm";
import { signUpAction } from "@/actions/authActions";
import { createSignupSchema } from "@/lib/validators/auth.validator";
import { FormActionResult } from "@/lib/core/result";
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
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordRequirement,
  PasswordStrengthBar,
} from "@/components/domain/auth/password-strength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

const MIN_LENGTH = 8;
const REGEX_UPPERCASE = /[A-Z]/;
const REGEX_NUMBER = /[0-9]/;
const REGEX_SPECIAL_CHAR = /[^A-Za-z0-9]/;

export function RegisterForm() {
  const tAuth = useTranslations("Auth.RegisterForm");
  const tValidation = useTranslations("Auth.validation");
  const tPassword = useTranslations("PasswordPage.validation");
  const tGlobal = useTranslations("Global");

  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const formSchema = createSignupSchema(tPassword, tValidation);
  type FormValues = z.infer<typeof formSchema>;

  // Créer une action wrapper qui ajoute la locale
  const signUpWithLocaleAction = async (state: FormActionResult<null> | null, formData: FormData) => {
    formData.append("locale", locale);
    return signUpAction(state, formData);
  };

  const { form, state, formAction, isLoading, control } = useAuthForm<FormValues>({
    schema: formSchema,
    action: signUpWithLocaleAction,
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSuccess: () => {
      router.push(`/${locale}/login`);
    }
  });

  const passwordValue = useWatch({ control, name: "password" });

  useEffect(() => {
    const newRequirements = {
      length: (passwordValue || "").length >= MIN_LENGTH,
      uppercase: REGEX_UPPERCASE.test(passwordValue || ""),
      number: REGEX_NUMBER.test(passwordValue || ""),
      specialChar: REGEX_SPECIAL_CHAR.test(passwordValue || ""),
    };
    setRequirements(newRequirements);

    const strength = Object.values(newRequirements).filter(Boolean).length;
    setPasswordStrength(strength);
  }, [passwordValue]);

  return (
    <Card className="border-border/50 w-full max-w-md rounded-xl shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">{tAuth("title")}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {tAuth("description")}
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {/* Affichage des erreurs générales */}
            {state?.error && !state?.fieldErrors && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tAuth("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="nom@exemple.com" 
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
                  <FormLabel>{tAuth("passwordLabel")}</FormLabel>
                  <FormControl>
                    <PasswordInput 
                      placeholder="••••••••" 
                      autoComplete="new-password"
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="mt-2 space-y-1">
                    <PasswordRequirement
                      label={tPassword("length", { min: MIN_LENGTH })}
                      met={requirements.length}
                    />
                    <PasswordRequirement
                      label={tPassword("uppercase")}
                      met={requirements.uppercase}
                    />
                    <PasswordRequirement label={tPassword("number")} met={requirements.number} />
                    <PasswordRequirement
                      label={tPassword("specialChar")}
                      met={requirements.specialChar}
                    />
                  </div>
                  <PasswordStrengthBar strength={passwordStrength} />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tAuth("confirmPasswordLabel")}</FormLabel>
                  <FormControl>
                    <PasswordInput 
                      placeholder="••••••••" 
                      autoComplete="new-password"
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              size="lg"
              variant="secondary"
              className="mt-6 w-full shadow-md transition-transform duration-200 ease-in-out active:scale-95 hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? tGlobal("loading") : tAuth("submitButton")}
            </Button>
            <p className="mt-4 text-center text-sm">
              {tAuth("loginPrompt")}{" "}
              <Link
                href={`/${locale}/login`}
                className="hover:text-primary/90 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
              >
                {tAuth("loginLink")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
