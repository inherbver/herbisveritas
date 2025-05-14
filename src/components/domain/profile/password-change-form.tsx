"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// import { useToast } from '@/components/ui/use-toast'; // Si vous utilisez shadcn/ui toast
import { updatePassword } from "@/app/actions/profile"; // Le Server Action que nous créerons

// Schéma de validation Zod
const createPasswordSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .object({
      currentPassword: z.string().min(1, t("validation.currentPasswordRequired")),
      newPassword: z.string().min(8, t("validation.newPasswordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordsDoNotMatch"),
      path: ["confirmPassword"], // Erreur attachée au champ de confirmation
    });

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;

export default function PasswordChangeForm() {
  const t = useTranslations("PasswordPage.form"); // Namespace pour ce formulaire
  const tGlobal = useTranslations("Global");
  // const { toast } = useToast(); // Si vous utilisez shadcn/ui toast
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formSchema = createPasswordSchema(t);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordFormValues) {
    setIsLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const result = await updatePassword(values);
      if (result.error) {
        // Afficher l'erreur spécifique retournée par le Server Action
        // (par exemple, si le mot de passe actuel est incorrect)
        setServerError(result.error.message || t("feedback.updateErrorDefault"));
        // toast({ title: tGlobal('error'), description: result.error.message, variant: 'destructive' });
      } else {
        setSuccessMessage(t("feedback.updateSuccess"));
        // toast({ title: tGlobal('success'), description: t('feedback.updateSuccess') });
        form.reset();
        // Optionnel: déconnecter l'utilisateur ou le rediriger
      }
    } catch (error) {
      console.error("Password update failed:", error);
      setServerError(t("feedback.updateErrorDefault"));
      // toast({ title: tGlobal('error'), description: t('feedback.updateErrorDefault'), variant: 'destructive' });
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("currentPassword.label")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("currentPassword.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("newPassword.label")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("newPassword.placeholder")} {...field} />
              </FormControl>
              <FormDescription>{t("newPassword.description")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirmPassword.label")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("confirmPassword.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}
        {successMessage && <p className="text-sm font-medium text-green-600">{successMessage}</p>}

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? tGlobal("loading") : t("submitButton")}
        </Button>
      </form>
    </Form>
  );
}

// N'oubliez pas d'ajouter les clés de traduction dans vos fichiers (en.json, fr.json)
// sous le namespace "PasswordPage.form" et "PasswordPage.validation":
// "PasswordPage.form.currentPassword.label": "Current Password",
// "PasswordPage.form.currentPassword.placeholder": "Enter your current password",
// "PasswordPage.form.newPassword.label": "New Password",
// "PasswordPage.form.newPassword.placeholder": "Enter your new password",
// "PasswordPage.form.newPassword.description": "Minimum 8 characters.",
// "PasswordPage.form.confirmPassword.label": "Confirm New Password",
// "PasswordPage.form.confirmPassword.placeholder": "Confirm your new password",
// "PasswordPage.form.submitButton": "Change Password",
// "PasswordPage.form.feedback.updateSuccess": "Password updated successfully.",
// "PasswordPage.form.feedback.updateErrorDefault": "An error occurred. Please try again.",
// "PasswordPage.validation.currentPasswordRequired": "Current password is required.",
// "PasswordPage.validation.newPasswordMinLength": "New password must be at least 8 characters long.",
// "PasswordPage.validation.passwordsDoNotMatch": "New passwords do not match.",
