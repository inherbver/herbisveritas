import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Locale } from "@/i18n-config";
import { type Database } from "@/types/supabase";
import { ProductFilters } from "@/types/product-filters";
import { cacheSupabaseQuery, CACHE_CONFIG } from "@/lib/cache/cache-service";

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

// --- CACHED FUNCTION: getAllProducts ---
// Fetches all products with their basic details and translations for the shop grid
async function _getAllProducts(locale: Locale): Promise<ProductForShopQuery[]> {
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
    .eq("is_active", true) // ✅ Filtrer uniquement les produits actifs
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

// Export cached version
export const getAllProducts = cacheSupabaseQuery(
  _getAllProducts,
  { type: "products", identifier: "shop-list" },
  CACHE_CONFIG.PRODUCTS_LIST
);

// Define the specific type for the getProductBySlug query result
type ProductDataFromQuery = Database["public"]["Tables"]["products"]["Row"] & {
  product_translations: Database["public"]["Tables"]["product_translations"]["Row"][]; // It's an array!
};

// Cached version using our cache service
async function _getProductBySlug(slug: string, locale: Locale): Promise<ProductDataFromQuery | null> {
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
    .eq("is_active", true) // ✅ Filtrer uniquement les produits actifs
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

export const getProductBySlug = cacheSupabaseQuery(
  _getProductBySlug,
  { type: "products", identifier: "detail" },
  CACHE_CONFIG.PRODUCT_DETAIL
);

// --- NEW TYPE for Admin Panel ---
export type ProductWithTranslations = Database["public"]["Tables"]["products"]["Row"] & {
  product_translations: Database["public"]["Tables"]["product_translations"]["Row"][];
};

// Helper function for Supabase calls with timeout
async function supabaseCallWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Supabase_Query_Timeout")), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}

// Pagination options for admin queries
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Response with pagination metadata
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// --- OPTIMIZED FUNCTION for Admin Panel with Pagination ---
export async function getProductsForAdmin(
  filters?: ProductFilters,
  pagination?: PaginationOptions
): Promise<PaginatedResponse<ProductWithTranslations>> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Default pagination
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 25, 100); // Cap at 100 for performance
    const offset = (page - 1) * limit;
    const sortBy = pagination?.sortBy || 'created_at';
    const sortDirection = pagination?.sortDirection || 'desc';

    // Build base query with optimized select
    let baseQuery = supabase.from("products").select(`
        id,
        slug,
        price,
        image_url,
        stock,
        is_new,
        is_on_promotion,
        is_active,
        status,
        category,
        labels,
        unit,
        created_at,
        updated_at,
        product_translations!left (
          locale,
          name,
          short_description
        )
      `, { count: 'exact' });

    // Apply filters if provided
    if (filters) {
      if (filters.status.length > 0) {
        baseQuery = baseQuery.in("status", filters.status);
      }

      if (filters.categories.length > 0) {
        baseQuery = baseQuery.in("category", filters.categories);
      }

      if (filters.search.trim()) {
        // Use full-text search on translations for better performance
        baseQuery = baseQuery.or(
          `slug.ilike.%${filters.search.trim()}%,product_translations.name.ilike.%${filters.search.trim()}%`
        );
      }

      if (filters.priceRange) {
        baseQuery = baseQuery.gte("price", filters.priceRange.min);
        if (filters.priceRange.max !== Infinity) {
          baseQuery = baseQuery.lte("price", filters.priceRange.max);
        }
      }

      if (filters.inStock === true) {
        baseQuery = baseQuery.gt("stock", 0);
      } else if (filters.inStock === false) {
        baseQuery = baseQuery.eq("stock", 0);
      }

      if (filters.tags.length > 0) {
        baseQuery = baseQuery.overlaps("labels", filters.tags);
      }
    }

    // Add sorting and pagination
    const query = baseQuery
      .order(sortBy, { ascending: sortDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await supabaseCallWithTimeout(
      Promise.resolve(query), 
      6000 // Reduced timeout for better UX
    );

    if (error) {
      console.error("Error fetching products for admin:", error.message);
      return {
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data as ProductWithTranslations[]) || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (e) {
    console.error("Error in getProductsForAdmin:", e);
    return {
      data: [],
      pagination: {
        page: 1,
        limit: pagination?.limit || 25,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
}

export async function getProductByIdForAdmin(
  productId: string
): Promise<ProductWithTranslations | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const query = supabase
      .from("products")
      .select(
        `
        *,
        product_translations (*)
      `
      )
      .eq("id", productId)
      .single();

    const { data, error } = await supabaseCallWithTimeout(Promise.resolve(query), 8000);

    if (error) {
      if (error.code !== "PGRST116") {
        console.error(`Error fetching product by ID for admin (${productId}):`, error.message);
      }
      return null;
    }

    return data as ProductWithTranslations | null;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Supabase_Query_Timeout") {
        console.warn(
          `Supabase query timeout in getProductByIdForAdmin (${productId}). Returning null.`
        );
        return null;
      } else if (
        e.message.includes("fetch") ||
        e.message.includes("network") ||
        e.message.includes("Failed to fetch")
      ) {
        console.warn(
          `Network error during getProductByIdForAdmin (${productId}). Returning null:`,
          e.message
        );
        return null;
      } else {
        console.error(`Unexpected error in getProductByIdForAdmin (${productId}):`, e);
        return null;
      }
    }
    console.error(`Unknown error in getProductByIdForAdmin (${productId}):`, e);
    return null;
  }
}

// --- Important Next Steps ---
// 1. Populate the `product_translations` table with data for each product and locale.
// 2. Implement the actual add-to-cart logic in ProductDetailDisplay.tsx.
// 3. Ensure translation files (`messages/*.json`) have necessary keys.
// 4. Consider adapting the Shop page query (`getAllProducts`?) to also use translations if needed there.
