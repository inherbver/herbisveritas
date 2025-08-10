"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArticleExcerpt } from "@/components/features/magazine/tiptap-viewer";
import { ArticleMetadata } from "@/components/features/magazine/article-metadata";
import { TagList } from "@/components/features/magazine/tag-list";
import type { ArticleCardProps } from "@/types/magazine";

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  // Formater la date de publication
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(article.created_at || "").toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <article
      className={cn(
        "group relative flex h-full w-full min-w-0 flex-col",
        isFeatured && "md:col-span-2 lg:col-span-2"
      )}
    >
      {/* Container pour l'image avec lien principal */}
      <Link
        href={`/magazine/${article.slug}`}
        className="block"
        aria-label={`Lire l'article: ${article.title}`}
      >
        <div
          className={cn(
            "relative mb-4 overflow-hidden rounded-lg bg-muted",
            isCompact ? "aspect-[16/9]" : "aspect-[4/3]",
            isFeatured && "aspect-[16/9] md:aspect-[2/1]"
          )}
        >
          {article.featured_image ? (
            <Image
              src={article.featured_image}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes={
                isFeatured
                  ? "(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw"
                  : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              }
            />
          ) : (
            <div className="via-muted/80 to-muted/60 flex h-full w-full items-center justify-center bg-gradient-to-br from-muted">
              <span className="text-sm font-medium text-muted-foreground">Pas d'image</span>
            </div>
          )}

          {/* Overlay subtil au hover */}
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        </div>
      </Link>

      {/* Contenu de l'article - SÉPARÉ du lien principal */}
      <div className={cn("flex min-w-0 flex-grow flex-col", isFeatured && "md:space-y-4")}>
        {/* Contenu principal (flexible) */}
        <div className={cn("flex-grow space-y-3", isFeatured && "md:space-y-4")}>
          {/* Catégorie */}
          {article.category && (
            <Link
              href={`/magazine/category/${article.category.slug}`}
              className="inline-block transition-opacity hover:opacity-80"
              aria-label={`Voir tous les articles de la catégorie ${article.category.name}`}
            >
              <Badge
                variant="outline"
                className={cn(
                  "hover:bg-background/50 border-2 text-xs font-medium transition-colors",
                  isCompact && "text-[10px]"
                )}
                style={{
                  borderColor: article.category.color || "#6b7280",
                  color: article.category.color || "#6b7280",
                }}
              >
                {article.category.name}
              </Badge>
            </Link>
          )}

          {/* Titre avec lien */}
          <Link href={`/magazine/${article.slug}`}>
            <h3
              className={cn(
                "cursor-pointer font-semibold leading-tight text-foreground transition-colors duration-300 hover:text-primary",
                isCompact ? "text-base" : "text-xl",
                isFeatured && "md:text-2xl lg:text-3xl"
              )}
            >
              {article.title}
            </h3>
          </Link>

          {/* Extrait avec lien */}
          {!isCompact && (
            <Link href={`/magazine/${article.slug}`} className="block">
              <div
                className={cn(
                  "cursor-pointer leading-relaxed text-muted-foreground transition-colors duration-300 hover:text-foreground",
                  isFeatured ? "text-base" : "text-sm"
                )}
              >
                {article.excerpt ? (
                  <p>{article.excerpt}</p>
                ) : (
                  <ArticleExcerpt content={article.content} maxLength={isFeatured ? 200 : 120} />
                )}
              </div>
            </Link>
          )}
        </div>

        {/* Section inférieure fixe (métadonnées + tags) */}
        <div className="mt-auto space-y-3">
          {/* Métadonnées */}
          <ArticleMetadata
            author={article.author}
            publishedDate={publishedDate}
            readingTime={article.reading_time}
            viewCount={article.view_count}
            variant={isCompact ? "compact" : "default"}
            className={cn(isFeatured && "md:text-sm")}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <TagList
              tags={article.tags}
              maxVisible={isCompact ? 2 : isFeatured ? 5 : 3}
              variant={isCompact ? "compact" : "default"}
            />
          )}
        </div>
      </div>
    </article>
  );
}
