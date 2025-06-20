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
      product_translations!inner(
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
      .eq("product_translations.locale", locale) // Re-enable locale filter
      .single<ProductDataFromQuery>();

    if (error) {
      if (error.code !== "PGRST116") {
        // PGRST116: 'Searched for item with key "(...)" but not found'
        console.error(`Error fetching product by slug (${slug}, ${locale}):`, error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    // Defensive check: If the inner join somehow returns a product with no translations,
    // treat it as if the product was not found for this locale.
    if (!data.product_translations || data.product_translations.length === 0) {
      console.warn(
        `Product with slug '${slug}' found, but no matching translation for locale '${locale}'.`
      );
      return null;
    }

    return data;
  }
);

// --- Important Next Steps ---
// 1. Populate the `product_translations` table with data for each product and locale.
// 2. Implement the actual add-to-cart logic in ProductDetailDisplay.tsx.
// 3. Ensure translation files (`messages/*.json`) have necessary keys.
// 4. Consider adapting the Shop page query (`getAllProducts`?) to also use translations if needed there.
