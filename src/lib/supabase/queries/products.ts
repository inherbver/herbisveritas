import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Locale } from "@/i18n-config";
import { type Database } from "@/types/supabase";
import { cache } from "react";

// --- NEW TYPE for getAllProducts query result ---
// Includes only fields needed for the shop page grid + translations
export interface ProductForShopQuery {
  id: string;
  slug: string;
  price: number | null;
  image_url: string | null;
  stock: number | null;
  is_new: boolean | null;
  is_on_promotion: boolean | null;
  labels: string[] | null;
  unit?: string | null; // Ajout du champ unit
  product_translations:
    | {
        name: string;
        short_description: string | null;
        locale: string;
      }[]
    | null;
}

// --- NEW TYPE for getProductBySlug query result ---
// Includes fields needed for the product detail page + translations
export interface ProductForDetailQuery {
  id: string;
  slug: string;
  price: number | null;
  image_url: string | null;
  inci_list: string[] | null;
  product_translations:
    | {
        name: string;
        short_description: string | null;
        description_long: string | null;
        usage_instructions: string | null;
        properties: string | null;
        composition_text: string | null;
      }[]
    | null;
}

// --- NEW FUNCTION: getAllProducts ---
// Fetches all products with their basic details and translations for the shop grid
export async function getAllProducts(locale: Locale): Promise<ProductForShopQuery[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      slug,
      price,
      image_url,
      stock,         
      is_new,        
      is_on_promotion, 
      labels,        
      unit,          
      product_translations!left (
        name,
        short_description,
        locale
      )
    `
    )
    .or(`locale.eq.${locale},locale.is.null`, {
      foreignTable: "product_translations",
    });

  if (error) {
    console.error("Error fetching all products with translations:", error.message);
    return [];
  }

  if (!data) {
    return [];
  }

  return data as ProductForShopQuery[];
}

// Define the specific type for the getProductBySlug query result
type ProductDataFromQuery = Database["public"]["Tables"]["products"]["Row"] & {
  product_translations: Database["public"]["Tables"]["product_translations"]["Row"][]; // It's an array!
};

export const getProductBySlug = cache(
  async (slug: string, locale: Locale): Promise<ProductDataFromQuery | null> => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        slug,
        price,
        image_url,
        inci_list,
        unit,
        product_translations!left(
          locale,
          name,
          short_description,
          description_long,
          usage_instructions,
          properties,
          composition_text
        )
      `
      )
      .eq("slug", slug)
      // The filter is now on the left join, not a hard requirement on the query
      .or(`locale.eq.${locale},locale.is.null`, {
        foreignTable: "product_translations",
      })
      .maybeSingle<ProductDataFromQuery>();

    if (error) {
      // Do not log PGRST116 as an error, it's an expected 'not found' case
      if (error.code !== "PGRST116") {
        console.error(`Error fetching product by slug (${slug}, ${locale}):`, error);
      }
      return null;
    }

    return data;
  }
);

// --- NEW TYPE for Admin Panel ---
export type ProductWithTranslations = Database["public"]["Tables"]["products"]["Row"] & {
  product_translations: Database["public"]["Tables"]["product_translations"]["Row"][];
};

// --- NEW FUNCTION for Admin Panel ---
export async function getProductsForAdmin(): Promise<ProductWithTranslations[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from("products").select(`
      *,
      product_translations (*)
    `);

  if (error) {
    console.error("Error fetching products for admin:", error.message);
    return [];
  }

  return (data as ProductWithTranslations[]) || [];
}

export async function getProductByIdForAdmin(
  productId: string
): Promise<ProductWithTranslations | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_translations (*)
    `
    )
    .eq("id", productId)
    .single();

  if (error) {
    console.error(`Error fetching product by ID for admin (${productId}):`, error.message);
    return null;
  }

  return data as ProductWithTranslations | null;
}

// --- Important Next Steps ---
// 1. Populate the `product_translations` table with data for each product and locale.
// 2. Implement the actual add-to-cart logic in ProductDetailDisplay.tsx.
// 3. Ensure translation files (`messages/*.json`) have necessary keys.
// 4. Consider adapting the Shop page query (`getAllProducts`?) to also use translations if needed there.
