import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticles, getTagBySlug } from "@/lib/magazine/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowLeft, Hash } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ArticleExcerpt } from "@/components/magazine/tiptap-viewer";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Génération des métadonnées pour le SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  if (!tag) {
    return {
      title: "Tag non trouvé",
    };
  }

  return {
    title: `#${tag.name} | Magazine Herbis Veritas`,
    description: `Découvrez tous nos articles tagués "${tag.name}" sur les cosmétiques naturels et la beauté bio.`,
    openGraph: {
      title: `#${tag.name} - Magazine Herbis Veritas`,
      description: `Articles tagués "${tag.name}"`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `#${tag.name} - Magazine`,
      description: `Articles tagués "${tag.name}"`,
    },
  };
}

// Données structurées JSON-LD pour le tag
function generateTagStructuredData(tag: any, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `#${tag.name}`,
    "description": `Articles tagués "${tag.name}"`,
    "url": `${baseUrl}/magazine/tag/${tag.slug}`,
    "isPartOf": {
      "@type": "Blog",
      "name": "Magazine Herbis Veritas",
      "url": `${baseUrl}/magazine`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Herbis Veritas",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    }
  };
}

// Composant pour une carte d'article (réutilisé de la page catégorie)
function ArticleCard({ article }: { article: any }) {
  const publishedDate = article.published_at 
    ? new Date(article.published_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : new Date(article.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  return (
    <article className="group">
      <Link href={`/magazine/${article.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden mb-4 rounded-lg">
          {article.featured_image ? (
            <Image
              src={article.featured_image}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Pas d'image</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{publishedDate}</span>
            </div>
            {article.author && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{article.author.first_name} {article.author.last_name}</span>
              </div>
            )}
            {article.reading_time && (
              <span>{article.reading_time} min de lecture</span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {article.title}
          </h3>

          {article.excerpt && (
            <ArticleExcerpt content={article.excerpt} className="text-sm text-gray-600 line-clamp-3" />
          )}

          {/* Catégorie */}
          {article.category && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: article.category.color || "#6B7280" }}
              />
              <Badge variant="outline" className="text-xs">
                {article.category.name}
              </Badge>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

async function TagContent({ slug }: { slug: string }) {
  const tag = await getTagBySlug(slug);

  if (!tag) {
    notFound();
  }

  const { articles } = await getArticles({ tag_ids: [tag.id], status: 'published' }, 1, 20);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const structuredData = generateTagStructuredData(tag, baseUrl);

  return (
    <main className="min-h-screen bg-white">
      {/* Données structurées JSON-LD pour le SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Navigation */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">Accueil</Link>
            <span>/</span>
            <Link href="/magazine" className="hover:text-gray-900">Magazine</Link>
            <span>/</span>
            <span className="text-gray-900">#{tag.name}</span>
          </div>
        </div>
      </div>

      {/* Header du tag */}
      <section className="bg-gradient-to-r from-purple-50 to-pink-50 py-16">
        <div className="container mx-auto px-4">
          <Link
            href="/magazine"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au magazine
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <Hash className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              {tag.name}
            </h1>
          </div>

          <p className="text-xl text-gray-600 max-w-2xl">
            Découvrez tous nos articles tagués "{tag.name}".
          </p>

          <div className="mt-6">
            <Badge variant="outline" className="text-sm">
              {articles.length} article{articles.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="container mx-auto px-4 py-12">
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              Aucun article publié avec ce tag pour le moment.
            </p>
            <Link
              href="/magazine"
              className="inline-block mt-4 text-purple-600 hover:text-purple-800 underline"
            >
              Découvrir d'autres articles
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

// Skeleton réutilisé de la page catégorie
function TagSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <section className="bg-gradient-to-r from-purple-50 to-pink-50 py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-12 w-96 mb-4" />
          <Skeleton className="h-6 w-2/3 mb-6" />
          <Skeleton className="h-6 w-24" />
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function TagPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<TagSkeleton />}>
      <TagContent slug={slug} />
    </Suspense>
  );
}