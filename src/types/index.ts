export interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  first_name: string;
  last_name: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country_code: string;
  phone_number?: string;
  email?: string;
  state_province_region?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
