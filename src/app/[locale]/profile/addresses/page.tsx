"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";

import { Locale } from "@/i18n-config";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import AddressForm from "@/components/domain/profile/address-form";
import type { AddressFormData } from "@/lib/validators/address.validator";
import type { User } from "@supabase/supabase-js";

import { syncProfileAddressFlag } from "@/actions/profileActions";

interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  is_default: boolean;
  company_name?: string | null;
  full_name?: string | null;
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

type Props = {
  params: Promise<{ locale: Locale }>;
};

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
      {address.full_name && <p className="text-lg font-semibold">{address.full_name}</p>}
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
  const { locale } = use(params); // New way to access params in Client Components
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        redirect(`/${locale}/login?message=auth_required`);
        return;
      }
      setUser(currentUser);

      try {
        const { data: addressesData, error: fetchError } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("is_default", { ascending: false })
          .order("address_type", { ascending: true });

        if (fetchError) {
          console.error("Error fetching addresses:", fetchError.message);
        } else if (addressesData) {
          setShippingAddress(
            addressesData.find(
              (addr: Address) => addr.address_type === "shipping" && addr.is_default
            ) ||
              addressesData.find((addr: Address) => addr.address_type === "shipping") ||
              null
          );
          setBillingAddress(
            addressesData.find(
              (addr: Address) => addr.address_type === "billing" && addr.is_default
            ) ||
              addressesData.find((addr: Address) => addr.address_type === "billing") ||
              null
          );
          // Call Server Action to revalidate paths
        }
      } catch (error: unknown) {
        let message = "An unknown error occurred while fetching addresses.";
        if (error instanceof Error) {
          message = error.message;
        }
        console.error("Unexpected error fetching addresses:", message);
      }
      setLoading(false);
    };

    fetchData();
  }, [locale, supabase]);

  const handleOpenForm = (type: "shipping" | "billing", addressToEdit: Address | null = null) => {
    setFormAddressType(type);
    if (addressToEdit) {
      const formValues: Partial<AddressFormData> & { id?: string } = {
        id: addressToEdit.id,
        address_type: addressToEdit.address_type,
        is_default: addressToEdit.is_default,
        company_name: addressToEdit.company_name ?? undefined,
        full_name: addressToEdit.full_name ?? undefined,
        address_line1: addressToEdit.address_line1,
        address_line2: addressToEdit.address_line2 ?? undefined,
        postal_code: addressToEdit.postal_code,
        city: addressToEdit.city,
        country_code: addressToEdit.country_code,
        state_province_region: addressToEdit.state_province_region ?? undefined,
        phone_number: addressToEdit.phone_number ?? undefined,
      };
      setEditingAddress(formValues);
    } else {
      setEditingAddress(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormAddressType(null);
  };

  const handleFormSuccess = async () => {
    handleCloseForm();
    setLoading(true);
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) return;

    try {
      const { data: addressesData, error: fetchError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("is_default", { ascending: false })
        .order("address_type", { ascending: true });

      if (fetchError) {
        console.error("Error re-fetching addresses:", fetchError.message);
      } else if (addressesData) {
        setShippingAddress(
          addressesData.find(
            (addr: Address) => addr.address_type === "shipping" && addr.is_default
          ) ||
            addressesData.find((addr: Address) => addr.address_type === "shipping") ||
            null
        );
        setBillingAddress(
          addressesData.find(
            (addr: Address) => addr.address_type === "billing" && addr.is_default
          ) ||
            addressesData.find((addr: Address) => addr.address_type === "billing") ||
            null
        );
      }
    } catch (error: unknown) {
      let message = "An unknown error occurred while re-fetching addresses.";
      if (error instanceof Error) {
        message = error.message;
      }
      console.error("Unexpected error re-fetching addresses:", message);
    }
    setLoading(false);

    // Also, synchronize the profile's billing_address_is_different flag
    if (currentUser) {
      const syncResult = await syncProfileAddressFlag(locale, currentUser.id);
      if (!syncResult.success) {
        console.error("Failed to synchronize profile address flag:", syncResult.message);
        // Optionally, inform the user of this specific sync failure
      }
    }
  };

  if (loading) {
    return <p className="py-10 text-center">Loading addresses...</p>;
  }

  if (!user) {
    return <p className="py-10 text-center">Please log in to view your addresses.</p>;
  }

  const addressFormTranslationsObject = {
    formTitle: (type: "shipping" | "billing", isEditing: boolean) => {
      if (type === "shipping") {
        return isEditing ? tForm("formTitleEditShipping") : tForm("formTitleNewShipping");
      }
      return isEditing ? tForm("formTitleEditBilling") : tForm("formTitleNewBilling");
    },
    fieldLabels: {
      full_name: tForm("fieldLabels.full_name"),
      company_name: tForm("fieldLabels.company_name"),
      address_line1: tForm("fieldLabels.address_line1"),
      address_line2: tForm("fieldLabels.address_line2"),
      postal_code: tForm("fieldLabels.postal_code"),
      city: tForm("fieldLabels.city"),
      country_code: tForm("fieldLabels.country_code"),
      state_province_region: tForm("fieldLabels.state_province_region"),
      phone_number: tForm("fieldLabels.phone_number"),
      is_default: tForm("fieldLabels.is_default"), // Ajout de la clé manquante
    },
    checkboxLabelIsDefault: tForm("checkboxLabelIsDefault"),
    placeholders: {
      full_name: tForm("placeholders.full_name"),
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
            translations={addressFormTranslationsObject}
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
                  onClick={() => handleOpenForm("shipping", null)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("addAddressButton")}
                </button>
              )}
              {shippingAddress && !displayBillingSeparately && (
                <button
                  onClick={() => handleOpenForm("billing", null)}
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
              onEdit={() => handleOpenForm("shipping", shippingAddress)}
            />
          </section>

          {displayBillingSeparately && (
            <section>
              <div className="mb-4 flex items-center justify-between border-b border-gray-300 pb-2">
                <h2 className="text-2xl font-semibold text-gray-800">{t("billingAddressTitle")}</h2>
                {/* Le bouton d'ajout pour l'adresse de facturation ici est redondant si elle est déjà affichée séparément */}
                {/* On pourrait le laisser pour permettre de créer une *autre* adresse de facturation, mais cela complexifie la logique de 'is_default' */}
                {/* Pour l'instant, on suppose qu'il n'y a qu'une adresse de facturation 'active' affichée */}
              </div>
              <DisplayAddress
                address={billingAddress}
                translations={t}
                addressTypeLabel={t("billingAddressTitle")}
                onEdit={() => handleOpenForm("billing", billingAddress)}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
