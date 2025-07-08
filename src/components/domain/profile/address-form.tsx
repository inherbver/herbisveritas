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

// Types pour l'API d'adresse française
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

// Type unifié pour les pays
interface Country {
  code: string;
  name: string;
}

// Type pour les données brutes de pays avant normalisation
type RawCountry = { code?: string; name?: string; value?: string; label?: string };

// Type pour les champs du formulaire
type RenderableField = keyof Omit<AddressFormData, "address_type" | "is_default" | "company_name">;

export interface AddressFormProps {
  translations: AddressFormTranslations;
  addressType: "shipping" | "billing";
  existingAddress?: (Partial<AddressFormData> & { id?: string }) | null;
  onCancel: () => void;
  onSuccess: () => void;
  locale: string;
  countries: Record<string, RawCountry[]> | RawCountry[];
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
  const [addressSuggestions, setAddressSuggestions] = useState<BanFeature[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const addressLine1Value = watch("address_line1");
  const watchedCountry = watch("country_code");

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextFetch = useRef(false);
  const suggestionsRef = useRef<HTMLFieldSetElement>(null);

  // Initialisation du formulaire avec les données existantes
  useEffect(() => {
    if (existingAddress) {
      const { full_name, ...restOfDefaults } = existingAddress as Partial<
        Address & { full_name: string }
      >;
      const newValues: Partial<AddressFormData> = {
        address_type: addressType,
        country_code: "FR",
        ...restOfDefaults,
      };

      // Gestion du nom complet legacy
      if (full_name && !newValues.first_name && !newValues.last_name) {
        const nameParts = full_name.split(/\s+/);
        newValues.first_name = nameParts.shift() || "";
        newValues.last_name = nameParts.join(" ") || "";
      }

      reset(newValues);
      setShowAddressLine2(!!newValues.address_line2);
    }
  }, [existingAddress, reset, addressType]);

  // Gestion des clics en dehors des suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setAddressSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-complétion d'adresse
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

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
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [addressLine1Value]);

  const handleSelectAddress = (address: BanAddressProperties) => {
    skipNextFetch.current = true;
    const streetAddress = `${address.housenumber || ""} ${address.street || ""}`.trim();
    setValue("address_line1", streetAddress, { shouldValidate: true });
    setValue("postal_code", address.postcode, { shouldValidate: true });
    setValue("city", address.city, { shouldValidate: true });
    setAddressSuggestions([]);
  };

  // Normalisation des objets pays
  const normalizeCountry = (country: RawCountry): Country => {
    if (country.code && country.name) return { code: country.code, name: country.name };
    if (country.value && country.label) return { code: country.value, name: country.label };
    return {
      code: country.code || country.value || "UNKNOWN",
      name: country.name || country.label || "Unknown Country",
    };
  };

  // Obtention de la liste des pays
  const getCountriesList = (): Country[] => {
    if (Array.isArray(countries)) return countries.map(normalizeCountry);

    const localeKey = locale.toUpperCase() as keyof typeof countries;
    const countryData = countries[localeKey];
    if (Array.isArray(countryData)) return countryData.map(normalizeCountry);

    if ("FR" in countries && Array.isArray(countries.FR)) {
      return (countries.FR as RawCountry[]).map(normalizeCountry);
    }

    // Fallback
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

  // Rendu des champs du formulaire
  const renderField = (fieldName: RenderableField) => {
    // Affichage conditionnel pour état/province
    if (fieldName === "state_province_region" && !["US", "CA"].includes(watchedCountry)) {
      return null;
    }

    // Champ adresse ligne 1 avec auto-complétion
    if (fieldName === "address_line1") {
      return (
        <fieldset key={fieldName} className="relative" ref={suggestionsRef}>
          <Label htmlFor={fieldName}>{t.fieldLabels[fieldName]}</Label>
          <Input
            id={fieldName}
            {...register(fieldName)}
            placeholder={t.placeholders?.[fieldName]}
            autoComplete="address-line1"
          />
          {isAddressLoading && (
            <output className="mt-1 text-sm text-muted-foreground">Recherche...</output>
          )}
          {addressSuggestions.length > 0 && (
            <menu className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {addressSuggestions.map((suggestion) => (
                <li key={suggestion.properties.id}>
                  <button
                    type="button"
                    className="w-full cursor-pointer p-2 text-left hover:bg-accent"
                    onClick={() => handleSelectAddress(suggestion.properties)}
                  >
                    {suggestion.properties.label}
                  </button>
                </li>
              ))}
            </menu>
          )}
          {errors[fieldName] && (
            <output role="alert" className="mt-1 text-sm text-red-600">
              {errors[fieldName]?.message}
            </output>
          )}
        </fieldset>
      );
    }

    // Sélecteur de pays
    if (fieldName === "country_code") {
      return (
        <fieldset key={fieldName}>
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
                  {getCountriesList().map((country: Country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors[fieldName] && (
            <output role="alert" className="mt-1 text-sm text-red-600">
              {errors[fieldName]?.message}
            </output>
          )}
        </fieldset>
      );
    }

    // Champ input par défaut
    return (
      <fieldset key={fieldName}>
        <Label htmlFor={fieldName}>{t.fieldLabels[fieldName]}</Label>
        <Input
          id={fieldName}
          {...register(fieldName)}
          placeholder={t.placeholders?.[fieldName]}
          autoComplete={fieldName}
        />
        {errors[fieldName] && (
          <output role="alert" className="mt-1 text-sm text-red-600">
            {errors[fieldName]?.message}
          </output>
        )}
      </fieldset>
    );
  };

  // Soumission du formulaire
  const processSubmit: SubmitHandler<AddressFormData> = async (data) => {
    const dataToSubmit: AddressFormData = { ...data, address_type: addressType };

    try {
      const result: FormActionResult =
        isEditing && existingAddress?.id
          ? await updateAddress(existingAddress.id, dataToSubmit, locale)
          : await addAddress(dataToSubmit, locale);

      if (result.success) {
        onSuccess();
      } else {
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
    } catch (_error) {
      setError("root.unexpectedError", {
        type: "server",
        message: "An unexpected error occurred.",
      });
    }
  };

  // Définition des groupes de champs
  const recipientFields: RenderableField[] = ["first_name", "last_name"];
  const mainAddressFields: RenderableField[] = [
    "postal_code",
    "city",
    "country_code",
    "state_province_region",
  ];
  const contactFields: RenderableField[] = ["email", "phone_number"];

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">{t.formTitle(addressType, isEditing)}</h1>
      </header>

      <form onSubmit={handleSubmit(processSubmit)} className="space-y-8">
        {/* Section Destinataire */}
        <section className="space-y-4 border-t pt-4">
          <h2 className="text-lg font-medium">{t.recipientSectionTitle}</h2>
          <address className="grid grid-cols-1 gap-4 not-italic md:grid-cols-2">
            {recipientFields.map(renderField)}
          </address>
        </section>

        {/* Section Adresse */}
        <section className="space-y-4 border-t pt-4">
          <h2 className="text-lg font-medium">{t.addressSectionTitle}</h2>

          {renderField("address_line1")}

          <fieldset className="flex items-center space-x-2">
            <Checkbox
              id="show_address_line2_checkbox"
              onCheckedChange={(checked) => {
                const isChecked = checked as boolean;
                setShowAddressLine2(isChecked);
                if (!isChecked) setValue("address_line2", "", { shouldValidate: true });
              }}
              checked={showAddressLine2}
            />
            <Label htmlFor="show_address_line2_checkbox" className="cursor-pointer">
              Complément d'adresse ?
            </Label>
          </fieldset>

          {showAddressLine2 && <aside className="pl-2">{renderField("address_line2")}</aside>}

          <address className="space-y-4 not-italic">{mainAddressFields.map(renderField)}</address>
        </section>

        {/* Section Contact */}
        <section className="space-y-4 border-t pt-4">
          <h2 className="text-lg font-medium">{t.contactSectionTitle}</h2>
          <address className="grid grid-cols-1 gap-4 not-italic md:grid-cols-2">
            {contactFields.map(renderField)}
          </address>
        </section>

        {/* Adresse par défaut */}
        <fieldset className="flex items-center space-x-2 border-t pt-6">
          <Checkbox
            id="is_default"
            {...register("is_default")}
            defaultChecked={existingAddress?.is_default}
          />
          <Label htmlFor="is_default">{t.fieldLabels.is_default}</Label>
        </fieldset>
        {errors.is_default && (
          <output role="alert" className="mt-1 text-sm text-red-600">
            {errors.is_default?.message}
          </output>
        )}

        {/* Messages d'erreur globaux */}
        {errors.root?.serverError && (
          <output className="text-sm font-medium text-destructive">
            {errors.root.serverError.message}
          </output>
        )}
        {errors.root?.unexpectedError && (
          <output className="text-sm font-medium text-destructive">
            {errors.root.unexpectedError.message}
          </output>
        )}

        {/* Actions */}
        <footer className="flex flex-col justify-end space-y-3 pt-4 sm:flex-row sm:space-x-3 sm:space-y-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t.buttons.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? t.buttons.saving : t.buttons.save}
          </Button>
        </footer>
      </form>
    </main>
  );
};

export default AddressForm;
