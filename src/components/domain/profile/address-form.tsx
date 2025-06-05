"use client";

import React from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, AddressFormData } from "@/lib/schemas/addressSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { addAddress, updateAddress } from "@/actions/addressActions"; // Import server actions
// TODO: Importer un composant Select pour country_code si disponible

// TODO: Définir une interface plus précise pour les traductions (pourrait provenir d'un fichier de types global pour i18n)
interface AddressFormTranslations {
  formTitle: (type: "shipping" | "billing", isEditing: boolean) => string;
  fieldLabels: {
    [key in keyof Omit<AddressFormData, "address_type">]: string;
  };
  checkboxLabelIsDefault: string;
  placeholders: {
    [key in keyof Omit<AddressFormData, "address_type" | "is_default">]?: string;
  };
  buttons: {
    save: string;
    saving: string;
    cancel: string;
  };
  successMessage?: string;
  errorMessage?: string;
}

interface AddressFormProps {
  translations: AddressFormTranslations;
  addressType: "shipping" | "billing";
  existingAddress?: (Partial<AddressFormData> & { id?: string }) | null; // id est optionnel pour un nouvel objet mais requis pour la maj
  onCancel: () => void;
  onSuccess: () => void; // Callback pour gérer le succès (ex: fermer modal, rafraîchir)
  locale: string; // Ajout de la locale pour les server actions
}

const AddressForm: React.FC<AddressFormProps> = ({
  translations: t,
  addressType,
  existingAddress,
  onCancel,
  onSuccess,
  locale, // Récupération de la locale
}) => {
  const isEditing = !!existingAddress?.id;
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError, // Récupération de la méthode setError
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_type: addressType,
      full_name: existingAddress?.full_name || "",
      company_name: existingAddress?.company_name || "",
      address_line1: existingAddress?.address_line1 || "",
      address_line2: existingAddress?.address_line2 || "",
      postal_code: existingAddress?.postal_code || "",
      city: existingAddress?.city || "",
      country_code: existingAddress?.country_code || "", // TODO: Valeur par défaut pour la création ?
      state_province_region: existingAddress?.state_province_region || "",
      phone_number: existingAddress?.phone_number || "",
      is_default: existingAddress?.is_default || false,
    },
  });

  const processSubmit: SubmitHandler<AddressFormData> = async (data) => {
    // Assurer que address_type est inclus, même s'il n'est pas un champ du formulaire direct
    const dataToSubmit: AddressFormData = {
      ...data,
      address_type: addressType,
    };

    // console.log('Form data to submit:', dataToSubmit);
    // await onSubmitAction(dataToSubmit); // Ancienne méthode, sera remplacée

    try {
      let result;
      if (isEditing && existingAddress?.id) {
        result = await updateAddress(existingAddress.id, dataToSubmit, locale);
      } else {
        result = await addAddress(dataToSubmit, locale);
      }

      if (result.success) {
        // alert(result.message); // TODO: Remplacer par un système de notification (toast)
        console.log("Success:", result.message);
        onSuccess(); // Appeler le callback de succès
      } else {
        // alert(`Error: ${result.error?.message}`); // TODO: Remplacer par un système de notification (toast)
        console.error("Error:", result.error?.message, result.error?.issues);
        if (result.error?.issues) {
          result.error.issues.forEach((issue) => {
            setError(issue.path[0] as keyof AddressFormData, {
              type: "server",
              message: issue.message,
            });
          });
        } else if (result.error?.message) {
          // Afficher une erreur globale si pas d'issues spécifiques
          setError("root.serverError", { type: "server", message: result.error.message });
        }
      }
    } catch (error) {
      console.error("Unexpected error submitting form:", error);
      // alert('An unexpected error occurred. Please try again.'); // TODO: Remplacer
      setError("root.unexpectedError", {
        type: "server",
        message: "An unexpected error occurred.",
      });
    }
  };

  const formFields: (keyof Omit<AddressFormData, "address_type" | "is_default">)[] = [
    "full_name",
    "company_name",
    "address_line1",
    "address_line2",
    "postal_code",
    "city",
    "country_code",
    "state_province_region",
    "phone_number",
  ];

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      <h3 className="text-xl font-semibold">{t.formTitle(addressType, isEditing)}</h3>

      {formFields.map((fieldName) => (
        <div key={fieldName} className="space-y-1">
          <Label htmlFor={fieldName}>{t.fieldLabels[fieldName]}</Label>
          {/* TODO: Conditionner le type d'input ou le composant (ex: Select pour country_code) */}
          <Input
            id={fieldName}
            {...register(fieldName)}
            placeholder={t.placeholders[fieldName] || ""}
            aria-invalid={errors[fieldName] ? "true" : "false"}
            className={errors[fieldName] ? "border-red-500" : ""}
          />
          {errors[fieldName] && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors[fieldName]?.message}
            </p>
          )}
        </div>
      ))}

      <div className="flex items-center space-x-2 pt-2">
        <Controller
          name="is_default"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="is_default_checkbox" // ID unique pour l'élément checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-labelledby="is_default_label"
            />
          )}
        />
        <Label
          htmlFor="is_default_checkbox"
          id="is_default_label"
          className="cursor-pointer select-none"
        >
          {t.checkboxLabelIsDefault}
        </Label>
      </div>
      {errors.is_default && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {errors.is_default?.message}
        </p>
      )}

      {errors.root?.serverError?.message && (
        <p className="text-sm font-medium text-destructive">{errors.root.serverError.message}</p>
      )}
      {errors.root?.unexpectedError?.message && (
        <p className="text-sm font-medium text-destructive">
          {errors.root.unexpectedError.message}
        </p>
      )}
      <div className="flex flex-col justify-end space-y-3 pt-4 sm:flex-row sm:space-x-3 sm:space-y-0">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t.buttons.cancel}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? t.buttons.saving : t.buttons.save}
        </Button>
      </div>
    </form>
  );
};

export default AddressForm;
