/**
 * Utility functions for handling image URLs consistently across the application
 */

/**
 * Normalizes an image URL to ensure it's a complete, accessible URL
 * @param imageUrl - The image URL from the database (can be relative or absolute)
 * @param bucket - The Supabase storage bucket name (default: 'products')
 * @returns A complete, normalized image URL or undefined if invalid
 */
export function normalizeImageUrl(
  imageUrl: string | null | undefined,
  bucket: string = "products"
): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  // If already a complete URL (starts with http/https), return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // If it's a relative path starting with /, construct the full URL
  if (imageUrl.startsWith("/")) {
    const filename = imageUrl.split("/").pop();
    if (filename) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
      }
    }
  }

  // If it's just a filename, construct the full URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${imageUrl}`;
  }

  return undefined;
}

/**
 * Gets a fallback image URL for when the primary image fails to load
 * @param type - The type of fallback image needed
 * @returns A fallback image URL
 */
export function getFallbackImageUrl(type: "product" | "profile" | "general" = "general"): string {
  const fallbacks = {
    product: "/images/product-placeholder.png",
    profile: "/images/profile-placeholder.png",
    general: "/images/placeholder.png",
  };

  return fallbacks[type];
}

/**
 * Validates if an image URL is likely to be accessible
 * This is a basic validation - actual accessibility should be tested with loading
 * @param imageUrl - The image URL to validate
 * @returns true if the URL appears valid
 */
export function isValidImageUrl(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;

  // Check if it's a valid URL format
  try {
    new URL(imageUrl);
    return true;
  } catch {
    // If not a complete URL, check if it's a valid relative path
    return imageUrl.startsWith("/") || !imageUrl.includes(" ");
  }
}

/**
 * Creates an optimized image URL with Next.js Image component parameters
 * @param imageUrl - The base image URL
 * @param width - Desired width
 * @param height - Desired height
 * @param quality - Image quality (1-100)
 * @returns Optimized image URL or original if optimization not possible
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  _width?: number,
  _height?: number,
  _quality: number = 75
): string {
  // For Supabase storage, we could add transformation parameters
  // This is a placeholder for future optimization
  return imageUrl;
}
