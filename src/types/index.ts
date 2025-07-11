export * from './cart';
export * from './shipping';

export interface Address {
  id: string;
  user_id: string;
  address_type: 'shipping' | 'billing';
  is_default: boolean;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address_line1: string;
  address_line2?: string | null;
  postal_code: string;
  city: string;
  country_code: string;
  state?: string;
  state_province_region?: string | null;
  phone_number?: string | null;
  email?: string;
  created_at: string;
  updated_at: string;
}
