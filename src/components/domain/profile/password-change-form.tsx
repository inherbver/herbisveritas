"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, type Circle as _Circle } from "lucide-react";

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
import { PasswordInput } from "@/components/ui/password-input";
// import { useToast } from '@/components/ui/use-toast'; // Si vous utilisez shadcn/ui toast
import { updatePasswordAction } from "@/app/[locale]/profile/actions";

// Schéma de validation Zod
const createPasswordSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .object({
      currentPassword: z.string().min(1, t("currentPasswordRequired")),
      newPassword: z.string().min(8, { message: t("newPasswordMinLength", { min: 8 }) }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"], // Erreur attachée au champ de confirmation
    });

type PasswordFormValues = z.infer<ReturnType<typeof createPasswordSchema>>;

const PasswordRequirement = ({ label, met }: { label: string; met: boolean }) => (
  <div className="flex items-center text-sm">
    {met ? (
      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="mr-2 h-4 w-4 text-destructive" />
    )}
    <span>{label}</span>
  </div>
);

const PasswordStrengthBar = ({ strength }: { strength: number }) => {
  const tStrength = useTranslations("PasswordPage.strengthIndicator");
  const strengthColors = [
    "bg-destructive", // Corresponds to "veryWeak"
    "bg-orange-400", // Corresponds to "weak"
    "bg-yellow-400", // Corresponds to "medium"
    "bg-green-400", // Corresponds to "strong"
    "bg-green-500", // Corresponds to "veryStrong"
  ];
  const strengthLabelKeys = ["veryWeak", "weak", "medium", "strong", "veryStrong"];

  const color = strengthColors[strength] || "bg-gray-200"; // strength is 0-4
  // Ensure strength is within bounds for keys, defaulting to 'veryWeak'
  const currentStrengthKey = strengthLabelKeys[strength] || strengthLabelKeys[0];
  const translatedLabelText = tStrength(currentStrengthKey);

  return (
    <div className="mt-1">
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-300 ease-in-out`}
          style={{ width: `${((strength + 1) / 5) * 100}%` }}
        />
      </div>
      {translatedLabelText && (
        <p className="mt-1 text-xs text-muted-foreground">
          {tStrength("label")} {translatedLabelText}
        </p>
      )}
    </div>
  );
};

export default function PasswordChangeForm() {
  const t = useTranslations("PasswordPage.form"); // Namespace pour ce formulaire
  const tGlobal = useTranslations("Global");
  // const { toast } = useToast(); // Commentaire original conservé, sonner.toast est utilisé directement
  const [isLoading, setIsLoading] = useState(false);
  const [_serverError, setServerError] = useState<string | null>(null);
  const [_successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength and requirements state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const tValidation = useTranslations("PasswordPage.validation");
  // Le schéma Zod pour la validation du formulaire est déjà défini par createPasswordSchema
  // Nous allons utiliser les mêmes regex pour la validation en temps réel des exigences
  const MIN_LENGTH = 8;
  const REGEX_UPPERCASE = /[A-Z]/;
  const REGEX_NUMBER = /[0-9]/;
  const REGEX_SPECIAL_CHAR = /[^A-Za-z0-9]/;

  const formSchema = createPasswordSchema(tValidation); // Utilise tValidation comme prévu

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched", // Pour une validation plus réactive
  });

  const newPasswordValue = useWatch({ control: form.control, name: "newPassword" });

  useEffect(() => {
    if (newPasswordValue === undefined) return; // Peut être undefined initialement

    const newReqs = {
      length: newPasswordValue.length >= MIN_LENGTH,
      uppercase: REGEX_UPPERCASE.test(newPasswordValue),
      number: REGEX_NUMBER.test(newPasswordValue),
      specialChar: REGEX_SPECIAL_CHAR.test(newPasswordValue),
    };
    setRequirements(newReqs);

    let strength = 0;
    if (newReqs.length) strength++;
    if (newReqs.uppercase) strength++;
    if (newReqs.number) strength++;
    if (newReqs.specialChar) strength++;
    if (newPasswordValue.length > 12) strength++; // Bonus for longer passwords
    setPasswordStrength(Math.min(strength, 4)); // Max strength 4 for the bar (0-4)
  }, [newPasswordValue]);

  async function onSubmit(values: PasswordFormValues) {
    setIsLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        formData.append(key, values[key as keyof PasswordFormValues]);
      });
      const result = await updatePasswordAction(null, formData);
      if (!result.success || result.error) {
        const fieldError = result.error?.field;
        const errorMessage = result.error?.message || t("feedback.updateErrorDefault");

        if (
          fieldError &&
          fieldError !== "general" &&
          (fieldError === "currentPassword" ||
            fieldError === "newPassword" ||
            fieldError === "confirmPassword")
        ) {
          form.setError(fieldError as keyof PasswordFormValues, {
            type: "manual",
            message: errorMessage,
          });
        } else {
          setServerError(errorMessage); // Gardé pour logique interne si besoin, mais le toast prendra le relais pour l'UX
          toast.error(errorMessage);
        }
        // L'ancien toast shadcn est remplacé par sonner ci-dessus pour les erreurs générales
        // Si l'erreur est spécifique à un champ, form.setError s'en charge, pas besoin de toast général.
      } else {
        setSuccessMessage(t("feedback.updateSuccess")); // Gardé pour logique interne si besoin
        toast.success(t("feedback.updateSuccess"));
        form.reset();
        // Optionnel: déconnecter l'utilisateur ou le rediriger
      }
    } catch (error) {
      console.error("Password update failed:", error);
      const defaultError = t("feedback.updateErrorDefault");
      setServerError(defaultError);
      toast.error(defaultError);
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
                <PasswordInput placeholder={t("currentPassword.placeholder")} {...field} />
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
                <PasswordInput placeholder={t("newPassword.placeholder")} {...field} />
              </FormControl>
              <FormDescription>{t("newPassword.description")}</FormDescription>
              <FormMessage />
              <div className="mt-2 space-y-1">
                <PasswordRequirement
                  label={tValidation("length", { min: MIN_LENGTH })}
                  met={requirements.length}
                />
                <PasswordRequirement
                  label={tValidation("uppercase")}
                  met={requirements.uppercase}
                />
                <PasswordRequirement label={tValidation("number")} met={requirements.number} />
                <PasswordRequirement
                  label={tValidation("specialChar")}
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
              <FormLabel>{t("confirmPassword.label")}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t("confirmPassword.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Les messages serverError et successMessage sont maintenant gérés par des toasts sonner */}

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
