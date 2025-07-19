"use client";

import React from "react";
import SharedAddressForm from "@/components/shared/address-form";
import type { AddressFormData } from "@/lib/validators/address.validator";
import type { Address } from "@/types";

interface CheckoutAddressFormProps {
  addressType: "shipping" | "billing";
  onSubmit: (data: AddressFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  existingAddress?: Address | null;
}

const CheckoutAddressForm: React.FC<CheckoutAddressFormProps> = ({
  addressType,
  onSubmit,
  onCancel,
  isSubmitting = false,
  existingAddress,
}) => {
  return (
    <SharedAddressForm
      addressType={addressType}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      existingAddress={existingAddress}
    />
  );
};

export default CheckoutAddressForm;
