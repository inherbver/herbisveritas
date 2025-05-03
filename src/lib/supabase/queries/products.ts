import { createClient } from "@/lib/supabase/server";
import { Locale } from "@/i18n-config";
import { ProductDetailData } from "@/components/domain/shop/product-detail-modal";

// Define the expected shape of the data returned by the query
interface ProductWithTranslation {
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
        locale: string;
      }[]
    | null;
}

// Helper function for price formatting (adjust currency as needed)
function formatPrice(price: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

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

export async function getProductBySlug(
  slug: string,
  locale: Locale
): Promise<ProductDetailData | null> {
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
      product_translations!left (
        name,
        short_description,
        description_long,
        usage_instructions,
        locale
      )
    `
    )
    .eq("slug", slug)
    .eq("product_translations.locale", locale)
    .single<ProductWithTranslation>();

  if (error) {
    console.error("Error fetching product by slug with translation:", error.message);
    return null;
  }

  if (!data) {
    console.log(`Product with slug ${slug} not found or no translation for locale ${locale}.`);
    return null;
  }

  console.log("--- DEBUG: Raw data from Supabase ---", JSON.stringify(data, null, 2));

  const translationObject =
    data.product_translations && data.product_translations.length > 0
      ? data.product_translations[0]
      : null;

  console.log(
    "--- DEBUG: Extracted translation object ---",
    JSON.stringify(translationObject, null, 2)
  );

  const images = data.image_url
    ? [
        {
          src: data.image_url,
          alt: `${translationObject?.name || "Product"} image 1`,
        },
      ]
    : [];

  const productDetail: ProductDetailData = {
    id: data.id,
    name: translationObject?.name || "Nom Indisponible",
    shortDescription: translationObject?.short_description || undefined,
    price: formatPrice(data.price || 0, locale),
    images: images,
    properties: translationObject?.description_long || undefined,
    usageInstructions: translationObject?.usage_instructions || undefined,
    inciList: data.inci_list || undefined,
  };

  console.log("--- DEBUG: Final productDetail object ---", JSON.stringify(productDetail, null, 2));

  console.log(`Successfully fetched product: ${productDetail.name}`);
  return productDetail;
}

// --- Important Next Steps ---
// 1. Populate the `product_translations` table with data for each product and locale.
// 2. Implement the actual add-to-cart logic in ProductDetailDisplay.tsx.
// 3. Ensure translation files (`messages/*.json`) have necessary keys.
// 4. Consider adapting the Shop page query (`getAllProducts`?) to also use translations if needed there.
