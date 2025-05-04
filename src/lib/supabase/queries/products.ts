import { createClient } from "@/lib/supabase/server";
import { Locale } from "@/i18n-config";
import { type Database } from "@/types/supabase";

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
  const supabase = await createClient();

  console.log(`Attempting to fetch all products for locale: ${locale}`);

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
      product_translations!left (
        name,
        short_description,
        locale
      )
    `
    )
    .eq("product_translations.locale", locale);

  if (error) {
    console.error("Error fetching all products with translations:", error.message);
    return [];
  }

  if (!data) {
    console.log(`No products found or no translations for locale ${locale}.`);
    return [];
  }

  console.log(`Successfully fetched ${data.length} products for locale ${locale}`);

  return data as ProductForShopQuery[];
}

// Define the specific type for the getProductBySlug query result
type ProductDataFromQuery = Database["public"]["Tables"]["products"]["Row"] & {
  product_translations: Database["public"]["Tables"]["product_translations"]["Row"][]; // It's an array!
};

export async function getProductBySlug(
  slug: string,
  locale: Locale
): Promise<ProductDataFromQuery | null> {
  const supabase = await createClient();

  console.log(`Attempting to fetch product with slug: ${slug} for locale: ${locale}`);

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
    console.error(`Error fetching product by slug (${slug}, ${locale}):`, error);
    return null;
  }

  if (!data) {
    console.log(`Product with slug ${slug} not found or no translation for locale ${locale}.`);
    return null;
  }

  console.log(`Successfully fetched product data for slug: ${slug}, locale: ${locale}`);
  return data;
}

// --- Important Next Steps ---
// 1. Populate the `product_translations` table with data for each product and locale.
// 2. Implement the actual add-to-cart logic in ProductDetailDisplay.tsx.
// 3. Ensure translation files (`messages/*.json`) have necessary keys.
// 4. Consider adapting the Shop page query (`getAllProducts`?) to also use translations if needed there.
