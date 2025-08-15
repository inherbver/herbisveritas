"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/utils/cn";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  loading?: "lazy" | "eager";
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onLoadingComplete?: () => void;
  fallbackSrc?: string;
}

/**
 * Composant d'image optimisé avec :
 * - Support WebP/AVIF automatique
 * - Lazy loading intelligent
 * - Fallback sur erreur
 * - Placeholder blur généré automatiquement
 * - Sizing responsif optimisé
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  sizes,
  fill = false,
  loading = "lazy",
  placeholder = "blur",
  blurDataURL,
  onLoadingComplete,
  fallbackSrc = "/images/placeholder-product.webp",
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Générer automatiquement un placeholder blur si non fourni
  const defaultBlurDataURL =
    blurDataURL ||
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyBnyDzRQhgOOuE/wByiyjgM2sLJV3h/wAcFGF/7t7jDMHg=";

  // Réinitialiser les états si src change
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Gérer les erreurs de chargement
  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  // Optimiser les sizes automatiquement si non défini
  const optimizedSizes =
    sizes ||
    (fill
      ? "100vw"
      : width && width <= 300
        ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw");

  const handleLoadingComplete = () => {
    setIsLoading(false);
    onLoadingComplete?.();
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        quality={quality}
        sizes={optimizedSizes}
        loading={loading}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        onError={handleError}
        onLoadingComplete={handleLoadingComplete}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          hasError && "grayscale"
        )}
        {...props}
      />

      {/* Skeleton loader pendant le chargement */}
      {isLoading && <div className="absolute inset-0 animate-pulse bg-muted" />}

      {/* Indicateur d'erreur */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Image non disponible</span>
        </div>
      )}
    </div>
  );
}

/**
 * Hook pour détecter si les images modernes sont supportées
 */
export function useModernImageSupport() {
  const [supportsWebP, setSupportsWebP] = useState(false);
  const [supportsAVIF, setSupportsAVIF] = useState(false);

  useEffect(() => {
    // Test support WebP
    const webpTest = new Image();
    webpTest.onload = () => setSupportsWebP(true);
    webpTest.src = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

    // Test support AVIF
    const avifTest = new Image();
    avifTest.onload = () => setSupportsAVIF(true);
    avifTest.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  }, []);

  return { supportsWebP, supportsAVIF };
}

/**
 * Utilitaire pour optimiser les URLs d'images Supabase
 */
export function optimizeSupabaseImageUrl(
  originalUrl: string,
  width?: number,
  height?: number,
  quality: number = 85,
  format: "webp" | "avif" | "auto" = "auto"
): string {
  if (!originalUrl?.includes("supabase")) {
    return originalUrl;
  }

  try {
    const url = new URL(originalUrl);
    const params = new URLSearchParams();

    if (width) params.set("width", width.toString());
    if (height) params.set("height", height.toString());
    params.set("quality", quality.toString());

    if (format !== "auto") {
      params.set("format", format);
    }

    // Ajouter resize et fit pour de meilleures performances
    params.set("resize", "contain");
    params.set("fit", "cover");

    url.search = params.toString();
    return url.toString();
  } catch (error) {
    console.warn("Erreur lors de l'optimisation de l'URL d'image:", error);
    return originalUrl;
  }
}
