// src/components/domain/auth/change-password-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { updatePasswordAction } from "@/app/[locale]/profile/actions";
import { createResetPasswordSchema } from "@/lib/validation/auth-schemas";
import {
  PasswordRequirement,
  PasswordStrengthBar,
} from "@/components/domain/auth/password-strength";
import useCartStore from "@/stores/cartStore";

const MIN_LENGTH = 8;
const REGEX_UPPERCASE = /[A-Z]/;
const REGEX_NUMBER = /[0-9]/;
const REGEX_SPECIAL_CHAR = /[^A-Za-z0-9]/;

export default function ChangePasswordForm() {
  const t = useTranslations("ChangePasswordForm");
  const tPassword = useTranslations("PasswordPage.validation");
  const tAuth = useTranslations("Auth.validation");
  const tGlobal = useTranslations("Global");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const formSchema = createResetPasswordSchema(tPassword, tAuth);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const passwordValue = useWatch({ control: form.control, name: "newPassword" });

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
  }, [passwordValue, MIN_LENGTH, REGEX_UPPERCASE, REGEX_NUMBER, REGEX_SPECIAL_CHAR]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("newPassword", values.newPassword);
    formData.append("confirmPassword", values.confirmPassword);

    const result = await updatePasswordAction(null, formData);

    if (result.success) {
      toast.success(result.message || t("notifications.success"));
      useCartStore.getState().clearCart();
      form.reset();
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const errorMessage =
        result.error?.message || result.message || t("notifications.errorUnknown");
      toast.error(errorMessage);
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("newPasswordLabel")}</FormLabel>
              <FormControl>
                <PasswordInput placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
              <div className="mt-2 space-y-1">
                <PasswordRequirement
                  label={tPassword("length", { min: MIN_LENGTH })}
                  met={requirements.length}
                />
                <PasswordRequirement label={tPassword("uppercase")} met={requirements.uppercase} />
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
              <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
              <FormControl>
                <PasswordInput placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? tGlobal("loading") : t("submitButton")}
        </Button>
      </form>
    </Form>
  );
}
