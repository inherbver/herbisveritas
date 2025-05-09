"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, ProfileFormValues } from "@/lib/schemas/profileSchema";
import { ProfileData } from "@/types/profile";
import { useTranslations } from "next-intl";
// import { updateProfileAction } from '@/actions/profileActions'; // Future Server Action

interface UpdateProfileFormProps {
  initialData: ProfileData;
  // locale: string; // Pourrait être utile pour passer aux Server Actions ou pour des logiques spécifiques
}

export default function UpdateProfileForm({ initialData }: UpdateProfileFormProps) {
  const t = useTranslations("ProfileEditPage.form"); // Namespace pour les traductions du formulaire
  const tGlobal = useTranslations("Global");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    // reset, // Utile pour réinitialiser le formulaire après soumission
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: initialData.first_name || "",
      last_name: initialData.last_name || "",
      phone_number: initialData.phone_number || "",
    },
  });

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    console.log("Form data submitted:", data);
    // try {
    //   const result = await updateProfileAction(data);
    //   if (result.success) {
    //     // Afficher un toast de succès
    //     // reset(data); // Réinitialise le formulaire avec les nouvelles données soumises pour que isDirty devienne false
    //   } else {
    //     // Afficher un toast d'erreur avec result.error
    //   }
    // } catch (error) {
    //   // Afficher un toast d'erreur générique
    // }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
          {t("firstName.label")}
        </label>
        <input
          id="first_name"
          type="text"
          {...register("first_name")}
          className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="first_name-error"
        />
        {errors.first_name && (
          <p id="first_name-error" className="mt-2 text-sm text-destructive">
            {errors.first_name.message}
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
          className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="last_name-error"
        />
        {errors.last_name && (
          <p id="last_name-error" className="mt-2 text-sm text-destructive">
            {errors.last_name.message}
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
          className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          aria-describedby="phone_number-error"
        />
        {errors.phone_number && (
          <p id="phone_number-error" className="mt-2 text-sm text-destructive">
            {errors.phone_number.message}
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="hover:bg-primary/90 flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {isSubmitting ? tGlobal("saving") : tGlobal("save_changes")}
        </button>
      </div>
    </form>
  );
}
