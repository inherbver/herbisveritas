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
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Controller } from "react-hook-form"; // Import pour Controller

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
  const tLegal = useTranslations("Legal");
  const locale = useLocale();

  const [formState, formAction] = useActionState(updateUserProfile, initialState);

  const {
    register,
    formState: { errors: clientErrors },
    reset,
    control,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: userProfile?.first_name || "",
      last_name: userProfile?.last_name || "",
      phone_number: userProfile?.phone_number || "",
      shipping_address_line1: userProfile?.shipping_address_line1 || "",
      shipping_address_line2: userProfile?.shipping_address_line2 || "",
      shipping_postal_code: userProfile?.shipping_postal_code || "",
      shipping_city: userProfile?.shipping_city || "",
      shipping_country: userProfile?.shipping_country || "",
      terms_accepted: !!userProfile?.terms_accepted_at,
    },
  });

  useEffect(() => {
    if (formState.success && formState.message) {
      toast.success(formState.message);
    } else if (!formState.success && formState.message) {
      toast.error(formState.message);
    }
  }, [formState]);

  useEffect(() => {
    if (formState.success && formState.resetKey) {
      reset({
        first_name: userProfile?.first_name || "",
        last_name: userProfile?.last_name || "",
        phone_number: userProfile?.phone_number || "",
        shipping_address_line1: userProfile?.shipping_address_line1 || "",
        shipping_address_line2: userProfile?.shipping_address_line2 || "",
        shipping_postal_code: userProfile?.shipping_postal_code || "",
        shipping_city: userProfile?.shipping_city || "",
        shipping_country: userProfile?.shipping_country || "",
        terms_accepted: !!userProfile?.terms_accepted_at,
      });
    }
  }, [formState.success, formState.resetKey, reset, userProfile]);

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

      <div>
        <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
          {t("firstName.label")}
        </label>
        <Input
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
        <Input
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
        <Input
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

      <h3 className="mt-6 border-t border-border pt-4 text-lg font-medium text-foreground">
        {t("shippingAddress.title")}
      </h3>

      <div>
        <label
          htmlFor="shipping_address_line1"
          className="block text-sm font-medium text-foreground"
        >
          {t("shippingAddressLine1.label")}
        </label>
        <Input
          id="shipping_address_line1"
          type="text"
          {...register("shipping_address_line1")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="shipping_address_line1-error"
          aria-invalid={
            clientErrors.shipping_address_line1 || formState?.errors?.shipping_address_line1
              ? "true"
              : "false"
          }
        />
        {(clientErrors.shipping_address_line1 || formState?.errors?.shipping_address_line1) && (
          <p id="shipping_address_line1-error" className="mt-1 text-sm text-destructive">
            {clientErrors.shipping_address_line1?.message ||
              formState?.errors?.shipping_address_line1?.[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="shipping_address_line2"
          className="block text-sm font-medium text-foreground"
        >
          {t("shippingAddressLine2.label")}
        </label>
        <Input
          id="shipping_address_line2"
          type="text"
          {...register("shipping_address_line2")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="shipping_address_line2-error"
          aria-invalid={
            clientErrors.shipping_address_line2 || formState?.errors?.shipping_address_line2
              ? "true"
              : "false"
          }
        />
        {(clientErrors.shipping_address_line2 || formState?.errors?.shipping_address_line2) && (
          <p id="shipping_address_line2-error" className="mt-1 text-sm text-destructive">
            {clientErrors.shipping_address_line2?.message ||
              formState?.errors?.shipping_address_line2?.[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label
            htmlFor="shipping_postal_code"
            className="block text-sm font-medium text-foreground"
          >
            {t("shippingPostalCode.label")}
          </label>
          <Input
            id="shipping_postal_code"
            type="text"
            {...register("shipping_postal_code")}
            className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            aria-describedby="shipping_postal_code-error"
            aria-invalid={
              clientErrors.shipping_postal_code || formState?.errors?.shipping_postal_code
                ? "true"
                : "false"
            }
          />
          {(clientErrors.shipping_postal_code || formState?.errors?.shipping_postal_code) && (
            <p id="shipping_postal_code-error" className="mt-1 text-sm text-destructive">
              {clientErrors.shipping_postal_code?.message ||
                formState?.errors?.shipping_postal_code?.[0]}
            </p>
          )}
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="shipping_city" className="block text-sm font-medium text-foreground">
            {t("shippingCity.label")}
          </label>
          <Input
            id="shipping_city"
            type="text"
            {...register("shipping_city")}
            className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            aria-describedby="shipping_city-error"
            aria-invalid={
              clientErrors.shipping_city || formState?.errors?.shipping_city ? "true" : "false"
            }
          />
          {(clientErrors.shipping_city || formState?.errors?.shipping_city) && (
            <p id="shipping_city-error" className="mt-1 text-sm text-destructive">
              {clientErrors.shipping_city?.message || formState?.errors?.shipping_city?.[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="shipping_country" className="block text-sm font-medium text-foreground">
          {t("shippingCountry.label")}
        </label>
        <Input
          id="shipping_country"
          type="text"
          {...register("shipping_country")}
          className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="shipping_country-error"
          aria-invalid={
            clientErrors.shipping_country || formState?.errors?.shipping_country ? "true" : "false"
          }
        />
        {(clientErrors.shipping_country || formState?.errors?.shipping_country) && (
          <p id="shipping_country-error" className="mt-1 text-sm text-destructive">
            {clientErrors.shipping_country?.message || formState?.errors?.shipping_country?.[0]}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-center space-x-2">
          <Controller
            name="terms_accepted"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="terms_accepted"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-describedby="terms_accepted-error"
              />
            )}
          />
          <Label htmlFor="terms_accepted" className="text-sm font-medium text-foreground">
            {tLegal("acceptTermsAndConditions")}
          </Label>
        </div>
        {(clientErrors.terms_accepted || formState?.errors?.terms_accepted) && (
          <p id="terms_accepted-error" className="mt-1 text-sm text-destructive">
            {clientErrors.terms_accepted?.message || formState?.errors?.terms_accepted?.[0]}
          </p>
        )}
      </div>

      <div className="pt-2">
        <SubmitButton text={tGlobal("save_changes")} pendingText={tGlobal("saving")} />
      </div>
    </form>
  );
}
