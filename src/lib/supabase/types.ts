import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Re-export Database type for use in other files
export type { Database };

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
export type Table<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * A utility type for the insert (creation) payload of a table in the 'public' schema.
 * @template T - The name of the table.
 */
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

/**
 * A utility type for the update payload of a table in the 'public' schema.
 * @template T - The name of the table.
 */
export type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// --- Specific Table Types ---
// Provides clear, reusable type definitions for commonly used tables.
export type Product = Table<"products">;
export type Cart = Table<"carts">;
export type CartItem = Table<"cart_items">;
export type Profile = Table<"profiles">;
export type Address = Table<"addresses">;
export type Market = Table<"markets">;
export type Partner = Table<"partners">;
