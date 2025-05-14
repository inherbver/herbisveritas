"use client";

import { useForm, Controller } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
const getInitialProfileValues = (userProfile: ProfileData | null): ProfileFormValues => {
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
      shipping_address_line1: "",
      shipping_address_line2: "",
      shipping_postal_code: "",
      shipping_city: "",
      shipping_country: "",
      billing_address_is_different: false, // Corresponds to z.boolean().default(false)
      billing_address_line1: "",
      billing_address_line2: "",
      billing_postal_code: "",
      billing_city: "",
      billing_country: "",
    };
    console.log("[getInitialProfileValues] No userProfile, returning:", defaultVals);
    return defaultVals;
  }
  const vals = {
    first_name: userProfile.first_name ?? "",
    last_name: userProfile.last_name ?? "",
    phone_number: userProfile.phone_number ?? "",
    shipping_address_line1: userProfile.shipping_address_line1 ?? "",
    shipping_address_line2: userProfile.shipping_address_line2 ?? "",
    shipping_postal_code: userProfile.shipping_postal_code ?? "",
    shipping_city: userProfile.shipping_city ?? "",
    shipping_country: userProfile.shipping_country ?? "",
    billing_address_is_different: userProfile.billing_address_is_different ?? false,
    billing_address_line1: userProfile.billing_address_line1 ?? "",
    billing_address_line2: userProfile.billing_address_line2 ?? "",
    billing_postal_code: userProfile.billing_postal_code ?? "",
    billing_city: userProfile.billing_city ?? "",
    billing_country: userProfile.billing_country ?? "",
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
    control,
    watch,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultValuesToUse,
  });

  const billingAddressIsDifferent = watch("billing_address_is_different");

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
      {/* Champ caché pour assurer la soumission de la valeur de la case à cocher */}
      <input
        type="hidden"
        name="billing_address_is_different"
        value={billingAddressIsDifferent ? "true" : "false"}
      />

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
            name="billing_address_is_different"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="billing_address_is_different"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-describedby="billing_address_is_different-error"
              />
            )}
          />
          <Label
            htmlFor="billing_address_is_different"
            className="text-sm font-medium text-foreground"
          >
            {t("billingAddressIsDifferent.label")}
          </Label>
        </div>
        {(clientErrors.billing_address_is_different ||
          formState?.errors?.billing_address_is_different) && (
          <p className="mt-1 text-sm text-destructive">
            {clientErrors.billing_address_is_different?.message ||
              formState?.errors?.billing_address_is_different?.[0]}
          </p>
        )}
      </div>

      {billingAddressIsDifferent && (
        <>
          <h3 className="mt-6 border-t border-border pt-4 text-lg font-medium text-foreground">
            {t("billingAddress.title")}
          </h3>
          <div>
            <label
              htmlFor="billing_address_line1"
              className="block text-sm font-medium text-foreground"
            >
              {t("billingAddressLine1.label")}
            </label>
            <Input
              id="billing_address_line1"
              type="text"
              {...register("billing_address_line1")}
              className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            {(clientErrors.billing_address_line1 || formState?.errors?.billing_address_line1) && (
              <p className="mt-1 text-sm text-destructive">
                {clientErrors.billing_address_line1?.message ||
                  formState?.errors?.billing_address_line1?.[0]}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="billing_address_line2"
              className="block text-sm font-medium text-foreground"
            >
              {t("billingAddressLine2.label")}
            </label>
            <Input
              id="billing_address_line2"
              type="text"
              {...register("billing_address_line2")}
              className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            {(clientErrors.billing_address_line2 || formState?.errors?.billing_address_line2) && (
              <p className="mt-1 text-sm text-destructive">
                {clientErrors.billing_address_line2?.message ||
                  formState?.errors?.billing_address_line2?.[0]}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label
                htmlFor="billing_postal_code"
                className="block text-sm font-medium text-foreground"
              >
                {t("billingPostalCode.label")}
              </label>
              <Input
                id="billing_postal_code"
                type="text"
                {...register("billing_postal_code")}
                className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
              {(clientErrors.billing_postal_code || formState?.errors?.billing_postal_code) && (
                <p className="mt-1 text-sm text-destructive">
                  {clientErrors.billing_postal_code?.message ||
                    formState?.errors?.billing_postal_code?.[0]}
                </p>
              )}
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="billing_city" className="block text-sm font-medium text-foreground">
                {t("billingCity.label")}
              </label>
              <Input
                id="billing_city"
                type="text"
                {...register("billing_city")}
                className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
              {(clientErrors.billing_city || formState?.errors?.billing_city) && (
                <p className="mt-1 text-sm text-destructive">
                  {clientErrors.billing_city?.message || formState?.errors?.billing_city?.[0]}
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="billing_country" className="block text-sm font-medium text-foreground">
              {t("billingCountry.label")}
            </label>
            <Input
              id="billing_country"
              type="text"
              {...register("billing_country")}
              className="bg-input mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            {(clientErrors.billing_country || formState?.errors?.billing_country) && (
              <p className="mt-1 text-sm text-destructive">
                {clientErrors.billing_country?.message || formState?.errors?.billing_country?.[0]}
              </p>
            )}
          </div>
        </>
      )}

      <div className="pt-2">
        <SubmitButton text={tGlobal("save_changes")} pendingText={tGlobal("saving")} />
      </div>
    </form>
  );
}
