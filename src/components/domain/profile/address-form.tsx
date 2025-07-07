"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodIssue } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addAddress, updateAddress } from "@/actions/addressActions";
import { countries } from "@/lib/countries";
import type { Address } from "@/types";
import { AddressFormData, addressSchema } from "@/lib/validators/address.validator";

// Types pour l'API d'adresse
interface BanAddressProperties {
  label: string;
  city: string;
  postcode: string;
  street: string;
  housenumber: string;
  id: string;
}

interface BanFeature {
  properties: BanAddressProperties;
}

interface BanApiResponse {
  features: BanFeature[];
}

// Type pour les résultats des actions serveur
interface FormActionResult {
  success: boolean;
  message?: string;
  error?: {
    message?: string;
    issues?: ZodIssue[];
  };
}

// Interface pour les traductions
interface AddressFormTranslations {
  formTitle: (addressType: "shipping" | "billing", isEditing: boolean) => string;
  recipientSectionTitle: string;
  addressSectionTitle: string;
  contactSectionTitle: string;
  fieldLabels: Record<string, string>;
  placeholders?: Record<string, string>;
  buttons: {
    cancel: string;
    save: string;
    saving: string;
  };
}

// Type pour les champs qui sont rendus dynamiquement dans le formulaire.
// Exclut les champs gérés séparément comme `is_default` ou les props comme `address_type`.
type RenderableField = keyof Omit<AddressFormData, "address_type" | "is_default" | "company_name">;

export interface AddressFormProps {
  translations: AddressFormTranslations;
  addressType: "shipping" | "billing";
  existingAddress?: Address;
  onCancel: () => void;
  onSuccess: () => void;
  locale: string;
}

const AddressForm: React.FC<AddressFormProps> = ({
  translations: t,
  addressType,
  existingAddress,
  onCancel,
  onSuccess,
  locale,
}) => {
  const isEditing = !!existingAddress?.id;
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
    reset,
    setValue,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_type: addressType,
      first_name: existingAddress?.first_name || "",
      last_name: existingAddress?.last_name || "",
      email: existingAddress?.email || "",
      address_line1: existingAddress?.address_line1 || "",
      address_line2: existingAddress?.address_line2 || "",
      postal_code: existingAddress?.postal_code || "",
      city: existingAddress?.city || "",
      country_code: existingAddress?.country_code || "FR",
      state_province_region: existingAddress?.state_province_region || "",
      phone_number: existingAddress?.phone_number || "",
      is_default: existingAddress?.is_default || false,
    },
  });

  const [showAddressLine2, setShowAddressLine2] = useState(!!existingAddress?.address_line2);

  useEffect(() => {
    if (existingAddress) {
      // Defensively handle potential legacy `full_name` from old address data
      const { full_name, ...restOfDefaults } = existingAddress as Partial<
        Address & { full_name: string }
      >;

      const newValues: Partial<AddressFormData> = {
        address_type: addressType,
        country_code: "FR",
        ...restOfDefaults,
      };

      if (full_name && !newValues.first_name && !newValues.last_name) {
        const nameParts = full_name.split(/\s+/);
        newValues.first_name = nameParts.shift() || "";
        newValues.last_name = nameParts.join(" ") || "";
      }

      reset(newValues);
      setShowAddressLine2(!!newValues.address_line2);
    }
  }, [existingAddress, reset, addressType]);

  const [addressSuggestions, setAddressSuggestions] = useState<BanFeature[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const addressLine1Value = watch("address_line1");
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextFetch = useRef(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Hook pour détecter les clics en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setAddressSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectAddress = (address: BanAddressProperties) => {
    skipNextFetch.current = true;
    const streetAddress = `${address.housenumber || ""} ${address.street || ""}`.trim();
    setValue("address_line1", streetAddress, { shouldValidate: true });
    setValue("postal_code", address.postcode, { shouldValidate: true });
    setValue("city", address.city, { shouldValidate: true });
    setAddressSuggestions([]);
  };

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    if (addressLine1Value && addressLine1Value.length >= 3) {
      timeoutIdRef.current = setTimeout(async () => {
        setIsAddressLoading(true);
        try {
          const url = new URL("https://api-adresse.data.gouv.fr/search/");
          url.searchParams.set("q", addressLine1Value);
          url.searchParams.set("limit", "5");
          url.searchParams.set("autocomplete", "1");
          const response = await fetch(url);
          if (!response.ok) throw new Error("Network response was not ok");
          const data: BanApiResponse = await response.json();
          setAddressSuggestions(data.features || []);
        } catch (error) {
          console.error("Error fetching addresses:", error);
          setAddressSuggestions([]);
        } finally {
          setIsAddressLoading(false);
        }
      }, 300);
    } else {
      setAddressSuggestions([]);
    }

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [addressLine1Value, setValue]);

  const watchedCountry = watch("country_code");

  // Fonction pour obtenir la liste des pays
  const getCountriesList = () => {
    // Si countries est un tableau simple
    if (Array.isArray(countries)) {
      return countries;
    }

    // Si countries est un objet avec des propriétés par locale
    const localeKey = locale.toUpperCase() as keyof typeof countries;
    const countryData = countries[localeKey];

    if (Array.isArray(countryData)) {
      return countryData;
    }

    // Fallback : essayer d'utiliser FR par défaut
    if ("FR" in countries && Array.isArray(countries.FR)) {
      return countries.FR;
    }

    // Dernier fallback : liste simple
    return [
      { code: "FR", name: "France" },
      { code: "US", name: "États-Unis" },
      { code: "CA", name: "Canada" },
      { code: "GB", name: "Royaume-Uni" },
      { code: "DE", name: "Allemagne" },
      { code: "ES", name: "Espagne" },
      { code: "IT", name: "Italie" },
    ];
  };

  const renderFormField = (fieldName: RenderableField) => {
    // Conditional rendering for state/province
    if (
      fieldName === "state_province_region" &&
      watchedCountry !== "US" &&
      watchedCountry !== "CA"
    ) {
      return null;
    }

    if (fieldName === "address_line1") {
      return (
        <div key={fieldName} className="relative" ref={suggestionsRef}>
          <Label htmlFor={fieldName}>{t.fieldLabels[fieldName]}</Label>
          <Input
            id={fieldName}
            {...register(fieldName)}
            placeholder={t.placeholders?.[fieldName]}
            autoComplete="off"
          />
          {isAddressLoading && <p className="mt-1 text-sm text-muted-foreground">Recherche...</p>}
          {addressSuggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {addressSuggestions.map((suggestion) => (
                <li
                  key={suggestion.properties.id}
                  className="cursor-pointer p-2 hover:bg-accent"
                  onClick={() => handleSelectAddress(suggestion.properties)}
                >
                  {suggestion.properties.label}
                </li>
              ))}
            </ul>
          )}
          {errors[fieldName] && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors[fieldName]?.message}
            </p>
          )}
        </div>
      );
    }

    if (fieldName === "country_code") {
      return (
        <div key={fieldName}>
          <Label htmlFor={fieldName}>{t.fieldLabels[fieldName]}</Label>
          <Controller
            name={fieldName}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder={t.placeholders?.country_code} />
                </SelectTrigger>
                <SelectContent>
                  {getCountriesList().map((country) => (
                    <SelectItem
                      key={country.code || (country as { value: string }).value}
                      value={country.code || (country as { value: string }).value}
                    >
                      {country.name || (country as { label: string }).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors[fieldName] && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors[fieldName]?.message}
            </p>
          )}
        </div>
      );
    }

    // Default input field
    return (
      <div key={fieldName}>
        <Label htmlFor={fieldName}>{t.fieldLabels[fieldName]}</Label>
        <Input id={fieldName} {...register(fieldName)} placeholder={t.placeholders?.[fieldName]} />
        {errors[fieldName] && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors[fieldName]?.message}
          </p>
        )}
      </div>
    );
  };

  const processSubmit: SubmitHandler<AddressFormData> = async (data) => {
    const dataToSubmit: AddressFormData = {
      ...data,
      address_type: addressType,
    };

    try {
      let result: FormActionResult;
      if (isEditing && existingAddress?.id) {
        result = await updateAddress(existingAddress.id, dataToSubmit, locale);
      } else {
        result = await addAddress(dataToSubmit, locale);
      }

      if (result.success) {
        console.log("Success:", result.message);
        onSuccess();
      } else {
        console.error("Error:", result.error?.message, result.error?.issues);
        if (result.error?.issues) {
          result.error.issues.forEach((issue: ZodIssue) => {
            setError(issue.path[0] as keyof AddressFormData, {
              type: "server",
              message: issue.message,
            });
          });
        } else if (result.error?.message) {
          setError("root.serverError", { type: "server", message: result.error.message });
        }
      }
    } catch (error) {
      console.error("Unexpected error submitting form:", error);
      setError("root.unexpectedError", {
        type: "server",
        message: "An unexpected error occurred.",
      });
    }
  };

  // Define fields for each section
  const recipientFields: RenderableField[] = ["first_name", "last_name"];
  const mainAddressFields: RenderableField[] = [
    "postal_code",
    "city",
    "country_code",
    "state_province_region",
  ];
  const contactFields: RenderableField[] = ["email", "phone_number"];

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-8">
      <h2 className="text-xl font-semibold">{t.formTitle(addressType, isEditing)}</h2>

      {/* Recipient Section */}
      <section className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">{t.recipientSectionTitle}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {recipientFields.map(renderFormField)}
        </div>
      </section>

      {/* Address Section */}
      <section className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">{t.addressSectionTitle}</h3>

        {renderFormField("address_line1")}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show_address_line2_checkbox"
            onCheckedChange={(checked) => {
              const isChecked = checked as boolean;
              setShowAddressLine2(isChecked);
              if (!isChecked) {
                setValue("address_line2", "", { shouldValidate: true });
              }
            }}
            checked={showAddressLine2}
            className="h-4 w-4 data-[state=unchecked]:border-2 data-[state=unchecked]:border-gray-500"
          />
          <label
            htmlFor="show_address_line2_checkbox"
            className="cursor-pointer text-sm font-medium leading-none"
          >
            Complément d'adresse ?
          </label>
        </div>

        {showAddressLine2 && <div className="pl-2">{renderFormField("address_line2")}</div>}

        {mainAddressFields.map(renderFormField)}
      </section>

      {/* Contact Section */}
      <section className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">{t.contactSectionTitle}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {contactFields.map(renderFormField)}
        </div>
      </section>

      <div className="flex items-center space-x-2 border-t pt-6">
        <Checkbox
          id="is_default"
          {...register("is_default")}
          defaultChecked={existingAddress?.is_default}
        />
        <Label htmlFor="is_default">{t.fieldLabels.is_default}</Label>
      </div>
      {errors.is_default && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {errors.is_default?.message}
        </p>
      )}

      {errors.root?.serverError && (
        <p className="text-sm font-medium text-destructive">{errors.root.serverError.message}</p>
      )}
      {errors.root?.unexpectedError && (
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
