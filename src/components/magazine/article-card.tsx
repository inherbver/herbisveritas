"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArticleExcerpt } from "@/components/magazine/tiptap-viewer";
import { ArticleMetadata } from "@/components/magazine/article-metadata";
import { TagList } from "@/components/magazine/tag-list";
import type { ArticleCardProps } from "@/types/magazine";

export function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';
  
  // Formater la date de publication
  const publishedDate = article.published_at 
    ? new Date(article.published_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long", 
        year: "numeric"
      })
    : new Date(article.created_at || '').toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  return (
    <article className={cn(
      "group relative",
      isFeatured && "md:col-span-2 lg:col-span-2"
    )}>
      {/* Container pour l'image avec lien principal */}
      <Link 
        href={`/magazine/${article.slug}`} 
        className="block"
        aria-label={`Lire l'article: ${article.title}`}
      >
        <div className={cn(
          "relative overflow-hidden rounded-lg mb-4 bg-muted",
          isCompact ? "aspect-[16/9]" : "aspect-[4/3]",
          isFeatured && "aspect-[16/9] md:aspect-[2/1]"
        )}>
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
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
              <span className="text-muted-foreground text-sm font-medium">
                Pas d'image
              </span>
            </div>
          )}
          
          {/* Overlay subtil au hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>
      </Link>

      {/* Contenu de l'article - SÉPARÉ du lien principal */}
      <div className={cn(
        "space-y-3",
        isFeatured && "md:space-y-4"
      )}>
        {/* Catégorie */}
        {article.category && (
          <Link 
            href={`/magazine/category/${article.category.slug}`}
            className="inline-block hover:opacity-80 transition-opacity"
            aria-label={`Voir tous les articles de la catégorie ${article.category.name}`}
          >
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium border-2 hover:bg-background/50 transition-colors",
                isCompact && "text-[10px]"
              )}
              style={{ 
                borderColor: article.category.color || '#6b7280', 
                color: article.category.color || '#6b7280' 
              }}
            >
              {article.category.name}
            </Badge>
          </Link>
        )}

        {/* Titre avec lien */}
        <Link href={`/magazine/${article.slug}`}>
          <h3 className={cn(
            "font-semibold leading-tight text-foreground hover:text-primary transition-colors duration-300 cursor-pointer",
            isCompact ? "text-base" : "text-xl",
            isFeatured && "md:text-2xl lg:text-3xl"
          )}>
            {article.title}
          </h3>
        </Link>

        {/* Extrait avec lien */}
        {!isCompact && (
          <Link href={`/magazine/${article.slug}`} className="block">
            <div className={cn(
              "text-muted-foreground leading-relaxed hover:text-foreground transition-colors duration-300 cursor-pointer",
              isFeatured ? "text-base" : "text-sm"
            )}>
              {article.excerpt ? (
                <p>{article.excerpt}</p>
              ) : (
                <ArticleExcerpt 
                  content={article.content} 
                  maxLength={isFeatured ? 200 : 120} 
                />
              )}
            </div>
          </Link>
        )}

        {/* Métadonnées */}
        <ArticleMetadata
          author={article.author}
          publishedDate={publishedDate}
          readingTime={article.reading_time}
          viewCount={article.view_count}
          variant={isCompact ? 'compact' : 'default'}
          className={cn(
            isFeatured && "md:text-sm"
          )}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <TagList
            tags={article.tags}
            maxVisible={isCompact ? 2 : (isFeatured ? 5 : 3)}
            variant={isCompact ? 'compact' : 'default'}
            className="mt-3"
          />
        )}
      </div>
    </article>
  );
}