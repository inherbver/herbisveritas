import type { AddressFormData } from "@/lib/validators/address.validator";

// This represents a complete address record as stored in the database.
export interface Address extends AddressFormData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingMethod {
  id: string;
  carrier: string;
  name: string;
  description: string | null;
  price: number | string; // Can be string from DB, convert to number
  is_active: boolean;
}
