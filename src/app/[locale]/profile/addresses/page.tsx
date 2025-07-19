"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useTranslations } from "next-intl";

import { Locale } from "@/i18n-config";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import AddressForm from "@/components/domain/profile/address-form";
import { AddressFormData, AddressFormTranslations } from "@/lib/validators/address.validator";
import { countries } from "@/lib/countries";

interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
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
  onEdit,
}: {
  address: Address;
  translations: (key: string) => string;
  onEdit: () => void;
}) => {
  const t = translations;

  return (
    <div className="relative h-full space-y-1 rounded-lg border bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
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
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-sm text-blue-600 hover:underline focus:outline-none"
        >
          {t("editAddressButton")}
        </button>
      </div>
    </div>
  );
};

export default function AddressesPage({ params }: Props) {
  const { locale } = use(params);
  const supabase = createClient();
  const t = useTranslations("AddressesPage");
  const tForm = useTranslations("AddressForm");

  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formAddressType, setFormAddressType] = useState<"shipping" | "billing" | null>(null);
  const [editingAddress, setEditingAddress] = useState<
    (Partial<AddressFormData> & { id?: string }) | null
  >(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect(`/${locale}/login`);
      return;
    }

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Error fetching addresses:", error);
    } else if (data) {
      setShippingAddress(data.find((addr) => addr.address_type === "shipping") || null);
      setBillingAddress(data.find((addr) => addr.address_type === "billing") || null);
    }
    setLoading(false);
  }, [supabase, locale]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (address: Address) => {
    // Convert null values to empty strings for form compatibility
    const formReadyAddress = {
      ...address,
      email: address.email ?? "",
      company_name: address.company_name ?? "",
      address_line2: address.address_line2 ?? "",
      state_province_region: address.state_province_region ?? "",
      phone_number: address.phone_number ?? "",
    };
    setEditingAddress(formReadyAddress);
    setFormAddressType(address.address_type);
    setShowForm(true);
  };

  const handleOpenForm = (type: "shipping" | "billing") => {
    const existing = type === "shipping" ? shippingAddress : billingAddress;
    if (existing) {
      // If an address exists, prepare it for the form
      handleEdit(existing);
    } else {
      // If no address exists, open a blank form
      setEditingAddress(null);
      setFormAddressType(type);
      setShowForm(true);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormAddressType(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormAddressType(null);
    fetchData(); // Re-fetch addresses after add/edit
  };

  if (loading) {
    return <div className="py-20 text-center">{t("loading")}</div>;
  }

  const formTitle = (addressType: "shipping" | "billing", isEditing: boolean) => {
    if (isEditing) {
      return t(addressType === "shipping" ? "editShippingAddressTitle" : "editBillingAddressTitle");
    }
    return t(addressType === "shipping" ? "addShippingAddressTitle" : "addBillingAddressTitle");
  };

  const translations: AddressFormTranslations = {
    formTitle: (addressType, isEditing) => formTitle(addressType, isEditing),
    recipientSectionTitle: tForm("recipientSectionTitle"),
    addressSectionTitle: tForm("addressSectionTitle"),
    contactSectionTitle: tForm("contactSectionTitle"),
    fieldLabels: {
      first_name: tForm("labels.first_name"),
      last_name: tForm("labels.last_name"),
      email: tForm("labels.email"),
      company_name: tForm("labels.company_name"),
      address_line1: tForm("labels.address_line1"),
      address_line2: tForm("labels.address_line2"),
      postal_code: tForm("labels.postal_code"),
      city: tForm("labels.city"),
      country_code: tForm("labels.country_code"),
      state_province_region: tForm("labels.state_province_region"),
      phoneNumber: tForm("labels.phoneNumber"),
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
      phoneNumber: tForm("placeholders.phoneNumber"),
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
            countries={countries}
          />
        </div>
      )}

      {!showForm && (
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
          <section className="h-full">
            <div className="mb-4 flex items-center justify-between border-b border-gray-300 pb-2">
              <h2 className="text-2xl font-semibold text-gray-800">{t("shippingAddressTitle")}</h2>
            </div>
            <div className="space-y-4">
              {shippingAddress ? (
                <DisplayAddress
                  key={shippingAddress.id}
                  address={shippingAddress}
                  translations={t}
                  onEdit={() => handleEdit(shippingAddress)}
                />
              ) : (
                <button
                  onClick={() => handleOpenForm("shipping")}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
                >
                  {t("addAddressButton")}
                </button>
              )}
            </div>
          </section>

          <section className="h-full">
            <div className="mb-4 flex items-center justify-between border-b border-gray-300 pb-2">
              <h2 className="text-2xl font-semibold text-gray-800">{t("billingAddressTitle")}</h2>
            </div>
            <div className="space-y-4">
              {billingAddress ? (
                <DisplayAddress
                  key={billingAddress.id}
                  address={billingAddress}
                  translations={t}
                  onEdit={() => handleEdit(billingAddress)}
                />
              ) : (
                <button
                  onClick={() => handleOpenForm("billing")}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
                >
                  {t("addAddressButton")}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
