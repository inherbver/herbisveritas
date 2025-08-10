import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MagazineHeroProps } from "@/types/magazine";

export function MagazineHero({
  title,
  description,
  categories = [],
  currentCategory,
  backgroundImage,
}: MagazineHeroProps) {
  return (
    <header className="relative overflow-hidden">
      {/* Image de fond optionnelle */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image src={backgroundImage} alt="" fill className="object-cover opacity-20" priority />
          <div className="from-background/80 via-background/60 to-background/90 absolute inset-0 bg-gradient-to-b" />
        </div>
      )}

      {/* Contenu principal */}
      <div
        className={cn(
          "relative z-10 px-4 py-16",
          !backgroundImage && "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
        )}
      >
        <div className="container mx-auto max-w-4xl space-y-8 text-center">
          {/* Titre et description */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {description}
            </p>
          </div>

          {/* Navigation par catégories */}
          {categories.length > 0 && (
            <nav className="flex flex-wrap justify-center gap-3" aria-label="Filtrer par catégorie">
              <Button
                variant={!currentCategory ? "default" : "outline"}
                size="sm"
                asChild
                className="rounded-full"
              >
                <Link href="/magazine">Tous les articles</Link>
              </Button>

              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={currentCategory === category.slug ? "default" : "outline"}
                  size="sm"
                  asChild
                  className="rounded-full"
                >
                  <Link href={`/magazine?category=${category.slug}`}>
                    <div
                      className="mr-2 h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: category.color || "#6b7280" }}
                      aria-hidden="true"
                    />
                    {category.name}
                  </Link>
                </Button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Séparateur subtil */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </header>
  );
}
