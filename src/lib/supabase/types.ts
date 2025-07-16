import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from "@/types/supabase";

// --- Centralized Supabase Client Type ---
/**
 * A centralized type for the Supabase client to ensure consistency across the app.
 * All functions creating or using a Supabase client should use this type.
 */
export type SupabaseClientType = SupabaseClient<Database>;

// --- Generic Type Helpers ---
/**
 * A utility type to easily access the row type of any table in the 'public' schema.
 * @template T - The name of the table.
 * @example type ProductRow = Table<'products'>;
 */
export type Table<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * A utility type for the insert (creation) payload of a table in the 'public' schema.
 * @template T - The name of the table.
 */
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

/**
 * A utility type for the update payload of a table in the 'public' schema.
 * @template T - The name of the table.
 */
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// --- Specific Table Types ---
// Provides clear, reusable type definitions for commonly used tables.
export type Product = Table<'products'>;
export type Cart = Table<'carts'>;
export type CartItem = Table<'cart_items'>;
export type Profile = Table<'profiles'>;
export type Address = Table<'addresses'>;

// --- RPC Function Types ---
/**
 * Defines the structure of the data returned by the `get_cart_data` RPC function.
 * This function is expected to join cart items with product details.
 */
export type CartDataFromServer = { 
  id: string; // cart id
  user_id: string;
  items: ServerCartItem[];
  // Computed properties if returned by the function
  subtotal?: number;
  total_items?: number;
};

/**
 * Represents a single item within the cart as returned by the server,
 * including details from the joined 'products' table.
 */
export type ServerCartItem = {
  product_id: string;
  quantity: number;
  name: string; // from products table
  price: number; // from products table
  image_url: string | null; // from products table
};
