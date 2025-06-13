// src/components/domain/about/photo-gallery-section.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card"; // Pour encadrer les images joliment

interface GalleryImage {
  src: string;
  alt: string;
  aspectRatio?: string; // e.g., "aspect-[3/4]" or "aspect-video"
}

export const PhotoGallerySection = () => {
  const t = useTranslations("AboutPage.PhotoGallery");

  // Vous remplacerez ces images par les vôtres
  const images: GalleryImage[] = [
    {
      src: "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/products/herbis-veritas-tisane-bio-detox.webp",
      alt: "Placeholder Image 1 - Product Example",
      aspectRatio: "aspect-square", // ou aspect-[1/1]
    },
    {
      src: "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/products/herbis-veritas-tisane-bio-sommeil.webp",
      alt: "Placeholder Image 2 - Product Example",
      aspectRatio: "aspect-square",
    },
    {
      src: "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/products/herbis-veritas-tisane-bio-energie.webp",
      alt: "Placeholder Image 3 - Product Example",
      aspectRatio: "aspect-square",
    },
    {
      src: "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/products/herbis-veritas-tisane-bio-anti-stress.webp",
      alt: "Placeholder Image 4 - Product Example",
      aspectRatio: "aspect-square",
    },
    {
      src: "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/products/herbis-veritas-tisane-bio-circulation.webp",
      alt: "Placeholder Image 5 - Product Example",
      aspectRatio: "aspect-square",
    },
  ];

  return (
    <section id="photo-gallery" className="bg-muted/40 py-12 md:py-16">
      {" "}
      {/* Fond légèrement différent */}
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl md:mb-12">
          {t("title")}
        </h2>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="mx-auto w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
        >
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="overflow-hidden">
                    {" "}
                    {/* Assure que l'image ne dépasse pas les coins arrondis de la Card */}
                    <CardContent
                      className={`flex ${image.aspectRatio || "aspect-square"} items-center justify-center p-0`}
                    >
                      <figure>
                        <Image
                          src={image.src}
                          alt={image.alt}
                          width={800} // Largeur indicative pour next/image, sera ajustée
                          height={800} // Hauteur indicative, ajustée par l'aspect ratio
                          className="h-full w-full object-cover" // Remplir la CardContent
                        />
                      </figure>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />{" "}
          {/* Cacher sur mobile pour plus d'espace */}
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div>
    </section>
  );
};
