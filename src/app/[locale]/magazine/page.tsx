// src/app/[locale]/magazine/page.tsx
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticles, getCategories } from "@/lib/magazine/queries";
import {
  ArticleFilters,
  MagazinePageProps,
  MagazineSearchParams,
  ArticlePagination,
} from "@/types/magazine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import { ArticleCard, MagazineHero } from "@/components/magazine";

// Génération des données structurées JSON-LD pour la page magazine
function generateMagazineStructuredData(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Magazine Herbis Veritas",
    description: "Articles, guides et conseils sur les cosmétiques naturels et la beauté bio",
    url: `${baseUrl}/magazine`,
    publisher: {
      "@type": "Organization",
      name: "Herbis Veritas",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    inLanguage: "fr-FR",
    genre: "Beauty, Health, Natural Cosmetics",
  };
}

type Props = MagazinePageProps;

// Génération des métadonnées pour le SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Magazine | Herbis Veritas - Articles et guides sur les cosmétiques naturels",
    description:
      "Découvrez nos articles exclusifs sur les cosmétiques naturels, conseils beauté bio, guides d'utilisation et actualités du monde de la beauté naturelle.",
    openGraph: {
      title: "Magazine Herbis Veritas - Cosmétiques naturels",
      description: "Articles, guides et conseils sur les cosmétiques naturels et la beauté bio.",
      type: "website",
      locale: locale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Magazine Herbis veritas",
      description: "Articles, guides et conseils sur les cosmétiques naturels et la beauté bio.",
    },
    alternates: {
      canonical: "/magazine",
    },
  };
}

// Le composant ArticleCard est maintenant importé depuis /components/magazine

// Les filtres de catégories sont maintenant intégrés dans MagazineHero

// Composant pour la pagination
function Pagination({ pagination, baseUrl }: { pagination: ArticlePagination; baseUrl: string }) {
  if (pagination.totalPages <= 1) return null;

  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <nav className="flex items-center justify-center space-x-2" aria-label="Pagination">
      {/* Page précédente */}
      {pagination.page > 1 && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`${baseUrl}${pagination.page > 2 ? `&page=${pagination.page - 1}` : ""}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Précédent
          </Link>
        </Button>
      )}

      {/* Numéros de page */}
      <div className="flex space-x-1">
        {pages.map((page) => (
          <Button
            key={page}
            variant={pagination.page === page ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={page === 1 ? baseUrl : `${baseUrl}&page=${page}`}>{page}</Link>
          </Button>
        ))}
      </div>

      {/* Page suivante */}
      {pagination.page < pagination.totalPages && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`${baseUrl}&page=${pagination.page + 1}`}>
            Suivant
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      )}
    </nav>
  );
}

// Composant principal combinant hero et articles
async function MagazineContent({
  searchParams,
  heroTitle,
}: {
  searchParams: MagazineSearchParams;
  heroTitle: string;
}) {
  const page = parseInt(searchParams.page || "1");
  const category = searchParams.category;
  const search = searchParams.search;

  const filters: ArticleFilters = {
    status: "published", // Seuls les articles publiés
  };

  // Récupérer les catégories une seule fois
  const categories = await getCategories();

  if (category) {
    // Récupérer l'ID de la catégorie depuis le slug
    const categoryData = categories.find((c) => c.slug === category);
    if (categoryData) {
      filters.category_id = categoryData.id;
    }
  }

  if (search) {
    filters.search = search;
  }

  const { articles, pagination } = await getArticles(filters, page, 9);

  // Construction de l'URL de base pour la pagination
  const baseUrl = `/magazine?${category ? `category=${category}` : ""}${search ? `${category ? "&" : ""}search=${search}` : ""}`;

  return (
    <>
      {/* Hero section avec navigation par catégories */}
      <MagazineHero
        title={heroTitle}
        description="Découvrez nos articles, guides et actualités sur l'herboristerie, les plantes médicinales et le bien-être naturel."
        categories={categories}
        currentCategory={category}
      />

      {/* Articles section */}
      <section className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Barre de recherche */}
          <div className="mx-auto max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                placeholder="Rechercher un article..."
                defaultValue={search}
                className="pl-10"
                name="search"
              />
            </div>
          </div>

          {/* Grille d'articles */}
          {articles.length > 0 ? (
            <>
              <div className="grid min-w-0 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination pagination={pagination} baseUrl={baseUrl} />
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-semibold">Aucun article trouvé</h3>
                  <p className="text-muted-foreground">
                    {search || category
                      ? "Essayez de modifier vos critères de recherche."
                      : "Aucun article n'a encore été publié."}
                  </p>
                  {(search || category) && (
                    <Button variant="outline" asChild>
                      <Link href="/magazine">Voir tous les articles</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

// Skeleton de chargement
function MagazineContentSkeleton() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-16">
        <div className="container mx-auto max-w-4xl space-y-8 text-center">
          <div className="space-y-4">
            <Skeleton className="mx-auto h-12 w-64" />
            <Skeleton className="mx-auto h-6 w-96" />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Articles skeleton */}
      <section className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Recherche skeleton */}
          <Skeleton className="mx-auto h-10 w-80" />

          {/* Grille skeleton */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default async function MagazinePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "MagazinePage" });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const structuredData = generateMagazineStructuredData(baseUrl);

  return (
    <main className="min-h-screen bg-background">
      {/* Données structurées JSON-LD pour le SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Contenu principal avec hero et articles */}
      <Suspense fallback={<MagazineContentSkeleton />}>
        <MagazineContent searchParams={resolvedSearchParams} heroTitle={t("title") || "Magazine"} />
      </Suspense>
    </main>
  );
}
