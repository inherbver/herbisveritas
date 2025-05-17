"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { profileSchema, ProfileFormValues } from "@/lib/schemas/profileSchema"; // Original import, potentially remove if not used elsewhere

// Local schema for account information only, matching the one in profileActions.ts
const localAccountInfoSchema = z.object({
  first_name: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." }) // These messages can be replaced by t() calls later
    .max(50, { message: "First name must be at most 50 characters." })
    .trim(),
  last_name: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." })
    .max(50, { message: "Last name must be at most 50 characters." })
    .trim(),
  phone_number: z
    .string()
    .regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, { message: "Invalid phone number format." })
    .or(z.literal(""))
    .nullable(),
});

type AccountInfoFormValues = z.infer<typeof localAccountInfoSchema>;
import { ProfileData } from "@/types/profile";
import { useTranslations, useLocale } from "next-intl";
import { updateUserProfile, UpdateProfileFormState } from "@/actions/profileActions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface UpdateProfileFormProps {
  userProfile: ProfileData | null;
}

const initialState: UpdateProfileFormState = {
  success: false,
  message: "",
  errors: {},
  resetKey: undefined,
};

// Helper function to generate default form values
const getInitialProfileValues = (userProfile: ProfileData | null): AccountInfoFormValues => {
  console.log("[getInitialProfileValues] Received userProfile:", userProfile);
  console.log(
    "[getInitialProfileValues] Received userProfile.billing_address_is_different:",
    userProfile?.billing_address_is_different
  );
  if (!userProfile) {
    const defaultVals = {
      first_name: "",
      last_name: "",
      phone_number: "",
    };
    console.log("[getInitialProfileValues] No userProfile, returning:", defaultVals);
    return defaultVals;
  }
  const vals = {
    first_name: userProfile.first_name ?? "",
    last_name: userProfile.last_name ?? "",
    phone_number: userProfile.phone_number ?? "",
  };
  console.log("[getInitialProfileValues] Has userProfile, returning:", vals);
  return vals;
};

function SubmitButton({ text, pendingText }: { text: string; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="hover:bg-primary/90 flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
    >
      {pending ? pendingText : text}
    </button>
  );
}

export default function UpdateProfileForm({ userProfile }: UpdateProfileFormProps) {
  console.log("UpdateProfileForm rendered. userProfile prop:", userProfile);
  console.log(
    "UpdateProfileForm rendered. userProfile.billing_address_is_different:",
    userProfile?.billing_address_is_different
  );

  const t = useTranslations("ProfileEditPage.form");
  const tGlobal = useTranslations("Global");
  const locale = useLocale();

  const [formState, formAction] = useActionState(updateUserProfile, initialState);

  const defaultValuesToUse = getInitialProfileValues(userProfile);

  const {
    register,
    formState: { errors: clientErrors, isDirty },
    reset,
  } = useForm<AccountInfoFormValues>({
    resolver: zodResolver(localAccountInfoSchema),
    defaultValues: defaultValuesToUse,
  });

  useEffect(() => {
    console.log(
      "[useEffect] Fired. formState.success:",
      formState.success,
      "formState.resetKey:",
      formState.resetKey
    );
    console.log(
      "[useEffect] userProfile.billing_address_is_different:",
      userProfile?.billing_address_is_different,
      "isDirty:",
      isDirty
    );

    // Priorité au reset demandé par le serveur après une action réussie
    if (formState.success && formState.resetKey) {
      const newDefaults = getInitialProfileValues(userProfile);
      console.log("[useEffect] Condition 1: Post-action reset. New defaults:", newDefaults);
      reset(newDefaults);
      return; // Sortir pour ne pas interférer avec la logique ci-dessous
    }

    // Si userProfile change ET que le formulaire n'a pas été modifié par l'utilisateur,
    // réinitialiser le formulaire avec les nouvelles valeurs par défaut.
    // Cela garantit que lors de la navigation vers la page, les dernières données sont affichées.
    if (userProfile && !isDirty) {
      const newDefaults = getInitialProfileValues(userProfile);
      console.log(
        "[useEffect] Condition 2: userProfile exists AND form NOT dirty. New defaults:",
        newDefaults
      );
      reset(newDefaults);
    } else {
      console.log(
        "[useEffect] Condition 2 not met. userProfile exists:",
        !!userProfile,
        "isDirty:",
        isDirty
      );
    }
    // Dépendances : userProfile pour réagir à ses changements,
    // reset et isDirty pour la logique de réinitialisation conditionnelle,
    // formState.resetKey et formState.success pour la réinitialisation post-action.
  }, [userProfile, reset, isDirty, formState.resetKey, formState.success]);

  useEffect(() => {
    if (formState.success && formState.message) {
      toast.success(formState.message);
    } else if (!formState.success && formState.message) {
      toast.error(formState.message);
    }
  }, [formState]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {formState?.message && !formState.errors && (
        <div
          className={`rounded-md p-3 text-sm ${
            formState.success
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}
          role={formState.success ? "status" : "alert"}
        >
          {formState.message}
        </div>
      )}
      <h2 className="text-lg font-semibold text-foreground">{t("personalInfo.title")}</h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
            {t("firstName.label")}
          </label>
          <Input
            id="first_name"
            type="text"
            {...register("first_name")}
            className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {(clientErrors.first_name || formState?.errors?.first_name) && (
            <p className="mt-1 text-sm text-destructive">
              {clientErrors.first_name?.message || formState?.errors?.first_name?.[0]}
            </p>
          )}
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="last_name" className="block text-sm font-medium text-foreground">
            {t("lastName.label")}
          </label>
          <Input
            id="last_name"
            type="text"
            {...register("last_name")}
            className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {(clientErrors.last_name || formState?.errors?.last_name) && (
            <p className="mt-1 text-sm text-destructive">
              {clientErrors.last_name?.message || formState?.errors?.last_name?.[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-foreground">
          {t("phoneNumber.label")}
        </label>
        <Input
          id="phone_number"
          type="tel"
          {...register("phone_number")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder={t("phoneNumber.placeholder")}
        />
        {(clientErrors.phone_number || formState?.errors?.phone_number) && (
          <p className="mt-1 text-sm text-destructive">
            {clientErrors.phone_number?.message || formState?.errors?.phone_number?.[0]}
          </p>
        )}
      </div>

      <div className="pt-2">
        <SubmitButton text={tGlobal("save_changes")} pendingText={tGlobal("saving")} />
      </div>
    </form>
  );
}
