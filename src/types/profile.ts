export interface ProfileData {
  id?: string; // Added optional id field
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  terms_accepted_at: string | null;
  // Nouveaux champs pour l'adresse de facturation
  billing_address_is_different: boolean | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_country: string | null;
}
