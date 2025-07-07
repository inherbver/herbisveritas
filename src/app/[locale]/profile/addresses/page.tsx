"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";

import { Locale } from "@/i18n-config";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import AddressForm from "@/components/domain/profile/address-form";
import type { AddressFormData, AddressFormTranslations } from "@/lib/validators/address.validator";
import { syncProfileAddressFlag } from "@/actions/profileActions";

interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  is_default: boolean;
  first_name: string;
  last_name: string;
  email?: string | null;
  company_name?: string | null;
  address_line1: string;
  address_line2?: string | null;
  postal_code: string;
  city: string;
  country_code: string;
  state_province_region?: string | null;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  params: Promise<{ locale: Locale }>;
}

const DisplayAddress = ({
  address,
  translations,
  addressTypeLabel,
  onEdit,
}: {
  address: Address | null;
  translations: (key: string, values?: Record<string, string | number | Date>) => string;
  addressTypeLabel: string;
  onEdit: () => void;
}) => {
  const t = translations;
  if (!address) {
    const noAddressMessage =
      addressTypeLabel === t("shippingAddressTitle")
        ? t("noShippingAddress")
        : t("noBillingAddress");
    return <p className="italic text-gray-500">{noAddressMessage}</p>;
  }

  return (
    <div className="relative space-y-1 rounded-lg border bg-white p-4 shadow-sm">
      {address.first_name && address.last_name && (
        <p className="text-lg font-semibold">{`${address.first_name} ${address.last_name}`}</p>
      )}
      {address.company_name && <p>{address.company_name}</p>}
      <p>{address.address_line1}</p>
      {address.address_line2 && <p>{address.address_line2}</p>}
      <p>{`${address.postal_code} ${address.city}`}</p>
      <p>
        {address.state_province_region && `${address.state_province_region}, `}
        {address.country_code}
      </p>
      {address.phone_number && (
        <p>
          {t("phone")}: {address.phone_number}
        </p>
      )}
      <button
        onClick={onEdit}
        className="mt-3 text-sm text-blue-600 hover:underline focus:outline-none"
      >
        {t("editAddressButton")}
      </button>
    </div>
  );
};

export default function AddressesPage({ params }: Props) {
  const { locale } = use(params);
  const supabase = createClient();
  const t = useTranslations("AddressesPage");
  const tForm = useTranslations("AddressForm");

  const [user, setUser] = useState<User | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<
    (Partial<AddressFormData> & { id?: string }) | null
  >(null);
  const [formAddressType, setFormAddressType] = useState<"shipping" | "billing" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        redirect(`/${locale}/login?message=auth_required`);
        return;
      }
      setUser(currentUser);

      const { data: addresses, error: addressesError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", currentUser.id);

      if (addressesError) throw addressesError;

      const shipping = addresses.find((a) => a.address_type === "shipping");
      const billing = addresses.find((a) => a.address_type === "billing");

      setShippingAddress(shipping || null);
      setBillingAddress(billing || null);

      const hasSeparateBillingAddress = !!billing;
      await syncProfileAddressFlag(String(hasSeparateBillingAddress));
    } catch (error) {
      console.error("Error fetching addresses:", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [locale, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (address: Address) => {
    if (!address) return;

    // Explicitly create an object compatible with AddressFormData
    const formReadyAddress: Partial<AddressFormData> & { id: string } = {
      id: address.id,
      address_type: address.address_type,
      is_default: address.is_default,
      first_name: address.first_name,
      last_name: address.last_name,
      email: address.email ?? "",
      company_name: address.company_name ?? "",
      address_line1: address.address_line1,
      address_line2: address.address_line2 ?? "",
      postal_code: address.postal_code,
      city: address.city,
      country_code: address.country_code,
      state_province_region: address.state_province_region ?? "",
      phone_number: address.phone_number ?? "",
    };

    setEditingAddress(formReadyAddress);
    setFormAddressType(address.address_type);
    setShowForm(true);
  };

  const handleOpenForm = (type: "shipping" | "billing") => {
    setEditingAddress(null);
    setFormAddressType(type);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormAddressType(null);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingAddress(null);

    await fetchData();
  };

  if (loading) {
    return <p className="py-10 text-center">Loading addresses...</p>;
  }

  if (!user) {
    return <p className="py-10 text-center">Please log in to view your addresses.</p>;
  }

  // Correction de la structure AddressFormTranslations
  const translations: AddressFormTranslations = {
    formTitle: (addressType: "shipping" | "billing", isEditing: boolean) =>
      tForm("formTitle", {
        isEditing: isEditing ? "true" : "false", // Conversion boolean en string
        addressType: t(`common.${addressType}Address`),
      }),
    recipientSectionTitle: tForm("recipientSectionTitle"),
    addressSectionTitle: tForm("addressSectionTitle"),
    contactSectionTitle: tForm("contactSectionTitle"),
    checkboxLabelIsDefault: tForm("checkboxLabelIsDefault"), // Ajout de la propriété manquante
    fieldLabels: {
      first_name: tForm("fieldLabels.first_name"),
      last_name: tForm("fieldLabels.last_name"),
      email: tForm("fieldLabels.email"),
      company_name: tForm("fieldLabels.company_name"),
      address_line1: tForm("fieldLabels.address_line1"),
      address_line2: tForm("fieldLabels.address_line2"),
      postal_code: tForm("fieldLabels.postal_code"),
      city: tForm("fieldLabels.city"),
      country_code: tForm("fieldLabels.country_code"),
      state_province_region: tForm("fieldLabels.state_province_region"),
      phone_number: tForm("fieldLabels.phone_number"),
      is_default: tForm("fieldLabels.is_default"),
    },
    placeholders: {
      first_name: tForm("placeholders.first_name"),
      last_name: tForm("placeholders.last_name"),
      email: tForm("placeholders.email"),
      company_name: tForm("placeholders.company_name"),
      address_line1: tForm("placeholders.address_line1"),
      address_line2: tForm("placeholders.address_line2"),
      postal_code: tForm("placeholders.postal_code"),
      city: tForm("placeholders.city"),
      country_code: tForm("placeholders.country_code"),
      state_province_region: tForm("placeholders.state_province_region"),
      phone_number: tForm("placeholders.phone_number"),
    },
    buttons: {
      save: tForm("buttons.save"),
      saving: tForm("buttons.saving"),
      cancel: tForm("buttons.cancel"),
      showOptionalFields: tForm("buttons.showOptionalFields"),
    },
    serverActions: {
      validationError: tForm("serverActions.validationError"),
      success: tForm("serverActions.success"),
      error: tForm("serverActions.error"),
    },
  };

  const displayBillingSeparately = !!billingAddress;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
      </header>

      {showForm && formAddressType && (
        <div className="mb-10 rounded-lg bg-gray-50 p-6 shadow-lg">
          <AddressForm
            translations={translations}
            addressType={formAddressType}
            existingAddress={editingAddress}
            onCancel={handleCloseForm}
            onSuccess={handleFormSuccess}
            locale={locale}
          />
        </div>
      )}

      {!showForm && (
        <div
          className={`grid grid-cols-1 ${displayBillingSeparately ? "md:grid-cols-2" : "md:grid-cols-1"} gap-x-8 gap-y-10`}
        >
          <section>
            <div className="mb-4 flex items-center justify-between border-b border-gray-300 pb-2">
              <h2 className="text-2xl font-semibold text-gray-800">
                {displayBillingSeparately
                  ? t("shippingAddressTitle")
                  : t("shippingAndBillingAddressTitle")}
              </h2>
              {!shippingAddress && (
                <button
                  onClick={() => handleOpenForm("shipping")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("addAddressButton")}
                </button>
              )}
              {shippingAddress && !displayBillingSeparately && (
                <button
                  onClick={() => handleOpenForm("billing")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("addSeparateBillingAddressButton")}
                </button>
              )}
            </div>
            <DisplayAddress
              address={shippingAddress}
              translations={t}
              addressTypeLabel={
                displayBillingSeparately
                  ? t("shippingAddressTitle")
                  : t("shippingAndBillingAddressTitle")
              }
              onEdit={() => handleEdit(shippingAddress!)}
            />
          </section>

          {displayBillingSeparately && (
            <section>
              <div className="mb-4 flex items-center justify-between border-b border-gray-300 pb-2">
                <h2 className="text-2xl font-semibold text-gray-800">{t("billingAddressTitle")}</h2>
              </div>
              <DisplayAddress
                address={billingAddress}
                translations={t}
                addressTypeLabel={t("billingAddressTitle")}
                onEdit={() => handleEdit(billingAddress!)}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
