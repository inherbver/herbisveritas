"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, ProfileFormValues } from "@/lib/schemas/profileSchema";
import { ProfileData } from "@/types/profile";
import { useTranslations, useLocale } from "next-intl";
import { updateUserProfile, UpdateProfileFormState } from "@/actions/profileActions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useEffect } from "react";

interface UpdateProfileFormProps {
  userProfile: ProfileData | null;
}

const initialState: UpdateProfileFormState = {
  success: false,
  message: "",
  errors: {},
  resetKey: undefined,
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
  const t = useTranslations("ProfileEditPage.form");
  const tGlobal = useTranslations("Global");
  const locale = useLocale();

  const [formState, formAction] = useActionState(updateUserProfile, initialState);

  const {
    register,
    // handleSubmit,
    formState: { errors: clientErrors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: userProfile?.first_name || "",
      last_name: userProfile?.last_name || "",
      phone_number: userProfile?.phone_number || "",
    },
  });

  useEffect(() => {
    if (formState.success && formState.resetKey) {
      reset({
        first_name: userProfile?.first_name || "",
        last_name: userProfile?.last_name || "",
        phone_number: userProfile?.phone_number || "",
      });
    }
  }, [formState.success, formState.resetKey, reset, userProfile]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {formState?.message && (
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

      <div>
        <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
          {t("firstName.label")}
        </label>
        <input
          id="first_name"
          type="text"
          {...register("first_name")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="first_name-error"
          aria-invalid={clientErrors.first_name || formState?.errors?.first_name ? "true" : "false"}
        />
        {(clientErrors.first_name || formState?.errors?.first_name) && (
          <p id="first_name-error" className="mt-1 text-sm text-destructive">
            {clientErrors.first_name?.message || formState?.errors?.first_name?.[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="last_name" className="block text-sm font-medium text-foreground">
          {t("lastName.label")}
        </label>
        <input
          id="last_name"
          type="text"
          {...register("last_name")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="last_name-error"
          aria-invalid={clientErrors.last_name || formState?.errors?.last_name ? "true" : "false"}
        />
        {(clientErrors.last_name || formState?.errors?.last_name) && (
          <p id="last_name-error" className="mt-1 text-sm text-destructive">
            {clientErrors.last_name?.message || formState?.errors?.last_name?.[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-foreground">
          {t("phoneNumber.label")}
        </label>
        <input
          id="phone_number"
          type="tel"
          {...register("phone_number")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="phone_number-error"
          aria-invalid={
            clientErrors.phone_number || formState?.errors?.phone_number ? "true" : "false"
          }
        />
        {(clientErrors.phone_number || formState?.errors?.phone_number) && (
          <p id="phone_number-error" className="mt-1 text-sm text-destructive">
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
