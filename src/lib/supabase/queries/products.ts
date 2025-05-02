import { createClient } from "@/lib/supabase/server";
import { Locale } from "@/i18n-config";
import { ProductDetailData } from "@/components/domain/shop/product-detail-modal"; // Assuming type is reused

// Define the expected shape of the data returned by the query
interface ProductWithTranslation {
  id: string;
  slug: string;
  price: number | null;
  image_url: string | null;
  product_translations: { // Structure attendue de la jointure interne
    name: string;
    short_description: string | null;
    description_long: string | null; // Correspond à 'properties'
    usage_instructions: string | null;
  }; // !inner join rend cette partie non-nulle si data est trouvé
}

// Helper function for price formatting (adjust currency as needed)
function formatPrice(price: number, locale: Locale): string {
  // Assuming the 'price' column stores the value directly, not in cents
  // If 'price' is in cents, divide by 100: price / 100
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(price); // Adjust if price is stored in cents
}

export async function getProductBySlug(
  slug: string,
  locale: Locale
): Promise<ProductDetailData | null> {
  const supabase = await createClient();

  console.log(
    `Attempting to fetch product with slug: ${slug} for locale: ${locale}`
  );

  // Updated query joining products with product_translations
  const { data, error } = await supabase
    .from("products") // Start from the products table
    .select(
      `
      id,
      slug,
      price,
      image_url,
      product_translations!inner (
        name,
        short_description,
        description_long,
        usage_instructions
      )
    `
    )
    .eq("slug", slug) // Filter products table by slug
    .eq("product_translations.locale", locale) // Filter translations table by locale
    .single<ProductWithTranslation>(); // Expect a single result with the defined type

  if (error) {
    console.error(
      "Error fetching product by slug with translation:",
      error.message
    );
    // Handle specific errors e.g., P0001 if no translation found for locale?
    // Or rely on .single() error if product itself not found.
    return null;
  }

  if (!data) {
    console.log(`Product with slug ${slug} not found or no translation for locale ${locale}.`);
    return null;
  }

  // --- Map the fetched data to the ProductDetailData structure ---
  // Note: With the generic type applied, TypeScript should correctly infer types below.
  const translation = data.product_translations; // Access the joined translation data

  // Image mapping: Use the single image_url
  const images = data.image_url
    ? [
        {
          src: data.image_url,
          alt: `${translation.name || "Product"} image 1`,
        },
      ]
    : []; // Provide an empty array if image_url is null

  const productDetail: ProductDetailData = {
    id: data.id,
    name: translation.name, // Use translated name
    shortDescription: translation.short_description || undefined, // Use translated short desc
    price: formatPrice(data.price || 0, locale), // Format price from products
    images: images,
    // Map description_long to 'properties' in the display component
    properties: translation.description_long || undefined,
    // Map usage_instructions to 'usageInstructions' in the display component
    usageInstructions: translation.usage_instructions || undefined,
  };

  console.log(`Successfully fetched product: ${productDetail.name}`);
  return productDetail;
}

// --- Important Next Steps ---
// 1. Populate the `product_translations` table with data for each product and locale.
// 2. Implement the actual add-to-cart logic in ProductDetailDisplay.tsx.
// 3. Ensure translation files (`messages/*.json`) have necessary keys.
// 4. Consider adapting the Shop page query (`getAllProducts`?) to also use translations if needed there.
