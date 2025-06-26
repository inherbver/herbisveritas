"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { signUpAction } from "@/actions/auth";
import { createSignupSchema } from "@/lib/validation/auth-schemas";
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

  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const formSchema = createSignupSchema(tPassword, tValidation);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = useWatch({ control: form.control, name: "password" });

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

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);
    formData.append("locale", locale);

    const result = await signUpAction(undefined, formData);

    if (result.success) {
      toast.success(result.message || tAuth("feedback.success"));
      router.push(`/${locale}/login`);
    } else {
      // Affiche les erreurs de champ spécifiques
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, errors]) => {
          form.setError(field as keyof FormValues, {
            type: "manual",
            message: errors.join(", "),
          });
        });
      }
      // Affiche une erreur générale si elle existe
      if (result.error) {
        toast.error(result.error);
      }
    }
    setIsLoading(false);
  }

  return (
    <Card className="border-border/50 w-full max-w-md rounded-xl shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">{tAuth("title")}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {tAuth("description")}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tAuth("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="nom@exemple.com" {...field} />
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
                    <PasswordInput placeholder="••••••••" {...field} />
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
                    <PasswordInput placeholder="••••••••" {...field} />
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
              className="mt-6 w-full shadow-md transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95"
              disabled={isLoading}
            >
              {isLoading ? tGlobal("loading") : tAuth("submitButton")}
            </Button>
            <p className="mt-4 text-center text-sm">
              {tAuth("loginPrompt")}{" "}
              <a
                href={`/${locale}/login`}
                className="hover:text-primary/90 font-semibold text-primary underline-offset-4 transition-colors hover:underline"
              >
                {tAuth("loginLink")}
              </a>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
