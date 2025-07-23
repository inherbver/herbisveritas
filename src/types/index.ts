export * from "./cart";
export * from "./shipping";

export interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  is_default: boolean;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  street_number?: string | null; // Nouveau champ pour le numéro de rue (optionnel)
  address_line1: string; // Maintenant utilisé pour "Rue" (obligatoire)
  address_line2?: string | null; // Maintenant "Complément d'adresse"
  postal_code: string;
  city: string;
  country_code: string;
  state?: string;
  state_province_region?: string | null;
  phone_number?: string | null;
  email?: string | null; // ✅ Harmonisé avec la DB qui peut retourner null
  created_at: string;
  updated_at: string;
}
