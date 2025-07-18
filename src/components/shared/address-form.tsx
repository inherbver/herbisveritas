"use client";

import React, { useState, useEffect, useRef, useTransition, FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { addAddress, updateAddress } from "@/actions/addressActions";
import { useAddressAutocomplete, BanAddressProperties, BanFeature } from "@/hooks/useAddressAutocomplete";
import { useLocale, useTranslations } from "next-intl";
import { countries } from "@/lib/countries";
import type { Address } from "@/types";
import { AddressFormData, addressSchema } from "@/lib/validators/address.validator";

interface AddressFormProps {
  addressType: "shipping" | "billing";
  existingAddress?: Address | null;
  onCancel?: () => void;
  onSuccess?: () => void; // For server action success
  onSubmit?: (data: AddressFormData) => void; // For custom checkout submission
  isSubmitting?: boolean; // To control loading state from parent
}

const AddressForm: FC<AddressFormProps> = ({
  addressType,
  existingAddress,
  onCancel,
  onSuccess,
  onSubmit: customOnSubmit,
  isSubmitting = false,
}) => {
  const t = useTranslations("AddressForm");
  const locale = useLocale();
    const [isPending, startTransition] = useTransition();
  const isLoading = isSubmitting || isPending;
  const isEditing = !!existingAddress?.id;
  const [showAddressLine2, setShowAddressLine2] = useState(!!existingAddress?.address_line2);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_type: addressType,
      first_name: existingAddress?.first_name || "",
      last_name: existingAddress?.last_name || "",
      email: existingAddress?.email || "",
      company_name: existingAddress?.company_name || "",
      address_line1: existingAddress?.address_line1 || "",
      address_line2: existingAddress?.address_line2 || "",
      postal_code: existingAddress?.postal_code || "",
      city: existingAddress?.city || "",
      country_code: existingAddress?.country_code || "FR",
      state_province_region: existingAddress?.state_province_region || "",
      phone_number: existingAddress?.phone_number || "",
    },
  });

  const { control, handleSubmit, watch, setValue, setError } = form;

  const countryList = countries[locale.toUpperCase() as keyof typeof countries] || countries.EN;
  const addressLine1Value = watch("address_line1");
  const watchedCountry = watch("country_code");
  const { 
    suggestions: addressSuggestions, 
    isLoading: isAddressLoading, 
    setSuggestions: setAddressSuggestions 
  } = useAddressAutocomplete(addressLine1Value, watchedCountry);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setAddressSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setAddressSuggestions]);

  const handleSelectAddress = (address: BanAddressProperties) => {
    setValue("address_line1", `${address.housenumber || ""} ${address.street}`.trim(), { shouldValidate: true });
    setValue("postal_code", address.postcode, { shouldValidate: true });
    setValue("city", address.city, { shouldValidate: true });
    setAddressSuggestions([]);
  };

    const processSubmit = (data: AddressFormData) => {
    if (customOnSubmit) {
      customOnSubmit(data);
      return;
    }

        startTransition(async () => {
      const result = isEditing
        ? await updateAddress(existingAddress!.id, data, locale)
        : await addAddress(data, locale);

      if (result.success) {
        toast.success(t(isEditing ? 'updateSuccess' : 'addSuccess'));
        onSuccess?.();
        form.reset();
      } else {
        if (result.error?.issues) {
          result.error.issues.forEach((issue: z.ZodIssue) => {
            setError(issue.path[0] as keyof AddressFormData, {
              type: "server",
              message: issue.message,
            });
          });
        } else {
          toast.error(result.error?.message || t('genericError'));
        }
      }
        });
  };

  return (
    <Form {...form}>
            <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fieldLabels.first_name')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('placeholders.first_name')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fieldLabels.last_name')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('placeholders.last_name')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="address_line1"
          render={({ field }) => (
            <FormItem>
              <div ref={suggestionsRef} className="relative">
                <FormLabel>{t('fieldLabels.address_line1')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('placeholders.address_line1')} autoComplete="off" />
                </FormControl>
                <FormMessage />
                {isAddressLoading && <p className="text-sm text-muted-foreground">{t('addressLoading')}</p>}
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-background border border-border rounded-md mt-1 shadow-lg">
                                        {addressSuggestions.map((feature: BanFeature) => (
                      <button
                        key={feature.properties.id}
                        type="button"
                        className="w-full text-left p-2 hover:bg-accent"
                        onClick={() => handleSelectAddress(feature.properties)}
                      >
                        {feature.properties.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormItem>
          )}
        />
        
        <div className="flex items-center space-x-2">
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
            {t('fieldLabels.address_line2')}
          </Label>
        </div>

        {showAddressLine2 && (
          <FormField
            control={control}
            name="address_line2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fieldLabels.address_line2')}</FormLabel>
                <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder={t('placeholders.address_line2')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fieldLabels.postal_code')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('placeholders.postal_code')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="city"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t('fieldLabels.city')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('placeholders.city')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="country_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fieldLabels.country_code')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.country_code')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {countryList.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t('buttons.cancel')}
            </Button>
          )}
                    <Button type="submit" disabled={isLoading || isAddressLoading}>
                        {(isLoading || isAddressLoading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? t('buttons.save') : t('buttons.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddressForm;
