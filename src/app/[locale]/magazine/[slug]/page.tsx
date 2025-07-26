import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getArticleBySlug, getPublishedArticles } from "@/lib/magazine/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TipTapViewer } from "@/components/magazine/tiptap-viewer";
import { ArticleDisplay, Tag } from "@/types/magazine";
import { Calendar, User, Clock, Eye, ArrowLeft, Facebook, Twitter, Linkedin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

// Génération des données structurées JSON-LD pour le SEO
function generateStructuredData(article: ArticleDisplay, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seo_description || article.excerpt || undefined,
    image: article.featured_image ? [article.featured_image] : [],
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || article.created_at,
    author: article.author
      ? {
          "@type": "Person",
          name: `${article.author.first_name || ""} ${article.author.last_name || ""}`.trim(),
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "Herbis Veritas",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/magazine/${article.slug}`,
    },
    articleSection: article.category?.name || undefined,
    keywords: article.tags?.map((tag: Tag) => tag.name).join(", ") || undefined,
    wordCount: article.reading_time ? article.reading_time * 250 : undefined, // Estimation : 250 mots/minute
  };
}

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Génération des métadonnées pour le SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article non trouvé",
    };
  }

  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.excerpt || undefined,
    openGraph: {
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt || undefined,
      type: "article",
      publishedTime: article.published_at || article.created_at || undefined,
      authors: article.author
        ? [`${article.author.first_name || ""} ${article.author.last_name || ""}`]
        : [],
      images: article.featured_image ? [article.featured_image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt || undefined,
      images: article.featured_image ? [article.featured_image] : [],
    },
  };
}

// Composant pour les boutons de partage
function ShareButtons({ article, currentUrl }: { article: ArticleDisplay; currentUrl: string }) {
  const shareText = `${article.title} - ${article.excerpt || ""}`;

  return (
    <div className="flex items-center gap-2">
      <span className="mr-2 text-sm text-gray-600">Partager :</span>

      <Button variant="outline" size="sm" asChild>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Partager sur Facebook"
        >
          <Facebook className="h-4 w-4" />
        </a>
      </Button>

      <Button variant="outline" size="sm" asChild>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Partager sur Twitter"
        >
          <Twitter className="h-4 w-4" />
        </a>
      </Button>

      <Button variant="outline" size="sm" asChild>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Partager sur LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

// Composant pour les articles connexes
async function RelatedArticles({ currentArticleId }: { currentArticleId: string }) {
  const relatedArticles = await getPublishedArticles(3);
  const filteredArticles = relatedArticles.filter((article) => article.id !== currentArticleId);

  if (filteredArticles.length === 0) return null;

  return (
    <section className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Articles connexes</h2>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.slice(0, 3).map((article) => (
            <Card key={article.id} className="transition-shadow hover:shadow-lg">
              <Link href={`/magazine/${article.slug}`}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                  {article.featured_image ? (
                    <Image
                      src={article.featured_image}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <span className="text-sm text-gray-400">Pas d'image</span>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  {article.category && (
                    <Badge
                      variant="outline"
                      className="mb-2 text-xs"
                      style={{
                        borderColor: article.category.color || undefined,
                        color: article.category.color || undefined,
                      }}
                    >
                      {article.category.name}
                    </Badge>
                  )}

                  <h3 className="mb-2 font-semibold text-gray-900 transition-colors hover:text-blue-600">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="line-clamp-2 text-sm text-gray-600">{article.excerpt}</p>
                  )}
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Composant principal de l'article
async function ArticleContent({ slug }: { slug: string }) {
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(article.created_at || "").toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/magazine/${article.slug}`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const structuredData = generateStructuredData(article, baseUrl);

  return (
    <div className="min-h-screen bg-white">
      {/* Données structurées JSON-LD pour le SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      {/* Breadcrumb et retour */}
      <div className="border-b bg-gray-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              Accueil
            </Link>
            <span>•</span>
            <Link href="/magazine" className="hover:text-gray-900">
              Magazine
            </Link>
            <span>•</span>
            <span className="text-gray-900">{article.title}</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <article className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header de l'article */}
        <header className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/magazine">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au magazine
              </Link>
            </Button>
          </div>

          {/* Catégorie */}
          {article.category && (
            <Link href={`/magazine/category/${article.category.slug}`}>
              <Badge
                variant="outline"
                className="mb-4 cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  borderColor: article.category.color || undefined,
                  color: article.category.color || undefined,
                }}
              >
                {article.category.name}
              </Badge>
            </Link>
          )}

          {/* Titre */}
          <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 md:text-4xl lg:text-5xl">
            {article.title}
          </h1>

          {/* Extrait */}
          {article.excerpt && (
            <p className="mb-6 text-xl leading-relaxed text-gray-600">{article.excerpt}</p>
          )}

          {/* Métadonnées */}
          <div className="mb-6 flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">
                {article.author?.first_name} {article.author?.last_name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={article.published_at || article.created_at || undefined}>
                {publishedDate}
              </time>
            </div>

            {article.reading_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{article.reading_time} min de lecture</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{article.view_count || 0} vues</span>
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {article.tags?.map((tag: Tag) => (
                <Link key={tag.id} href={`/magazine/tag/${tag.slug}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer text-xs transition-colors hover:bg-gray-200"
                  >
                    #{tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Partage */}
          <ShareButtons article={article} currentUrl={currentUrl} />
        </header>

        {/* Image mise en avant */}
        {article.featured_image && (
          <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg">
            <Image
              src={article.featured_image}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Contenu de l'article */}
        <div className="prose prose-lg max-w-none">
          <TipTapViewer content={article.content} />
        </div>

        {/* Footer de l'article */}
        <footer className="mt-12 border-t pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              Publié le {publishedDate}
              {article.updated_at &&
                article.created_at &&
                new Date(article.updated_at).toDateString() !==
                  new Date(article.created_at).toDateString() && (
                  <span>
                    {" "}
                    • Mis à jour le {new Date(article.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
            </div>

            <ShareButtons article={article} currentUrl={currentUrl} />
          </div>
        </footer>
      </article>

      {/* Articles connexes */}
      <Suspense
        fallback={
          <section className="bg-gray-50 py-12">
            <div className="container mx-auto px-4">
              <Skeleton className="mx-auto mb-8 h-8 w-48" />
              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3] w-full rounded-t-lg" />
                    <CardContent className="space-y-2 p-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        }
      >
        <RelatedArticles currentArticleId={article.id} />
      </Suspense>
    </div>
  );
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <div className="container mx-auto max-w-4xl px-4 py-8">
            <Skeleton className="mb-8 h-12 w-32" />
            <Skeleton className="mb-4 h-6 w-24" />
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="mb-6 h-6 w-3/4" />
            <div className="mb-6 flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mb-8 aspect-[16/9] w-full" />
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ArticleContent slug={slug} />
    </Suspense>
  );
}
