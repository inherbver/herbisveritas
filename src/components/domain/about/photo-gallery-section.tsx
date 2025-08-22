// src/components/domain/about/photo-gallery-section.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card"; // Pour encadrer les images joliment

interface GalleryImage {
  src: string;
  alt: string;
  aspectRatio?: string; // e.g., "aspect-[3/4]" or "aspect-video"
}

export const PhotoGallerySection = () => {
  const t = useTranslations("AboutPage.PhotoGallery");
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  // Vous remplacerez ces images par les vôtres
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const images: GalleryImage[] = [
    {
      src: `${supabaseUrl}/storage/v1/object/public/about//album_01.webp`,
      alt: "Image de la galerie 1",
      aspectRatio: "aspect-square",
    },
    {
      src: `${supabaseUrl}/storage/v1/object/public/about//album_02.webp`,
      alt: "Image de la galerie 2",
      aspectRatio: "aspect-square",
    },
    {
      src: `${supabaseUrl}/storage/v1/object/public/about//album_03.webp`,
      alt: "Image de la galerie 3",
      aspectRatio: "aspect-square",
    },
    {
      src: `${supabaseUrl}/storage/v1/object/public/about//album_04.webp`,
      alt: "Image de la galerie 4",
      aspectRatio: "aspect-square",
    },
  ];

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section id="photo-gallery" className="bg-muted/40 py-12 md:py-16">
      {" "}
      {/* Fond légèrement différent */}
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl md:mb-12">
          {t("title")}
        </h2>

        {/* Indication mobile pour le swipe */}
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:hidden">
          <ChevronLeft className="h-4 w-4 animate-pulse" />
          <span>Faites glisser pour voir plus</span>
          <ChevronRight className="h-4 w-4 animate-pulse" />
        </div>

        <div className="relative">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="mx-auto w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
          >
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
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

          {/* Indicateurs de défilement sur mobile */}
          <div className="mt-4 flex justify-center gap-2 sm:hidden">
            {Array.from({ length: count }, (_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index + 1 === current
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Aller à l'image ${index + 1}`}
              />
            ))}
          </div>

          {/* Compteur pour mobile */}
          <div className="mt-2 text-center text-xs text-muted-foreground sm:hidden">
            {current} sur {count}
          </div>
        </div>
      </div>
    </section>
  );
};
