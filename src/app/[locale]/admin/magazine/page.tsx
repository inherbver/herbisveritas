import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Eye, Calendar, User } from "lucide-react";
import Link from "next/link";
import { getArticles, getArticleStats } from "@/lib/magazine/queries";
import { ArticleFilters } from "@/types/magazine";
import { formatDate } from "@/lib/market-utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function ArticlesList({ searchParams }: { searchParams: any }) {
  const page = parseInt(searchParams.page as string) || 1;
  const status = searchParams.status as string;
  const search = searchParams.search as string;
  
  const filters: ArticleFilters = {};
  if (status && ['draft', 'published', 'archived'].includes(status)) {
    filters.status = status as any;
  }
  if (search) {
    filters.search = search;
  }

  const { articles, pagination } = await getArticles(filters, page, 12);

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun article trouvé</h3>
          <p className="text-muted-foreground text-center mb-4">
            {status || search 
              ? "Aucun article ne correspond à vos critères de recherche."
              : "Commencez par créer votre premier article."
            }
          </p>
          <Button asChild>
            <Link href="/admin/magazine/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel article
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Card key={article.id} className="hover:shadow-md transition-shadow flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge
                  variant={
                    article.status === "published" ? "default" :
                    article.status === "draft" ? "secondary" :
                    "outline"
                  }
                  className="mb-2"
                >
                  {article.status === "published" && "Publié"}
                  {article.status === "draft" && "Brouillon"}
                  {article.status === "archived" && "Archivé"}
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Eye className="h-3 w-3 mr-1" />
                  {article.view_count || 0}
                </div>
              </div>
              <CardTitle className="line-clamp-2 text-base leading-tight">
                {article.title}
              </CardTitle>
              {/* Réservation d'espace pour l'excerpt pour maintenir l'alignement */}
              <div className="min-h-[2.5rem]">
                {article.excerpt && (
                  <CardDescription className="line-clamp-2">
                    {article.excerpt}
                  </CardDescription>
                )}
              </div>
            </CardHeader>
            
            {/* CardContent avec flex-grow pour pousser les boutons vers le bas */}
            <CardContent className="pt-0 flex flex-col flex-grow">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {article.author?.first_name} {article.author?.last_name}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {article.published_at 
                    ? formatDate(article.published_at.split('T')[0])
                    : formatDate(article.created_at!.split('T')[0])
                  }
                </div>
              </div>
              
              {/* Conteneur avec hauteur fixe pour la catégorie */}
              <div className="min-h-[2rem] mb-3 flex items-start">
                {article.category && (
                  <Badge
                    variant="outline"
                    style={{ borderColor: article.category.color || undefined }}
                  >
                    {article.category.name}
                  </Badge>
                )}
              </div>

              {/* Spacer pour pousser les boutons vers le bas */}
              <div className="flex-grow"></div>

              {/* Boutons toujours alignés en bas */}
              <div className="flex gap-2 mt-auto">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/admin/magazine/${article.id}/edit`}>
                    Modifier
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/magazine/${article.slug}`} target="_blank">
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <Button
              key={i + 1}
              variant={pagination.page === i + 1 ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`?page=${i + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
                {i + 1}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

async function StatsCards() {
  const stats = await getArticleStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Publiés</CardTitle>
          <div className="h-4 w-4 rounded-full bg-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.published}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
          <div className="h-4 w-4 rounded-full bg-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.draft}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Archivés</CardTitle>
          <div className="h-4 w-4 rounded-full bg-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.archived}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Articles grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-12 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function AdminMagazinePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "AdminMagazine" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Magazine</h1>
          <p className="text-muted-foreground">
            Gérez vos articles et contenus éditoriaux
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/magazine/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvel article
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!resolvedSearchParams.status ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/admin/magazine">Tous</Link>
        </Button>
        <Button
          variant={resolvedSearchParams.status === "published" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="?status=published">Publiés</Link>
        </Button>
        <Button
          variant={resolvedSearchParams.status === "draft" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="?status=draft">Brouillons</Link>
        </Button>
        <Button
          variant={resolvedSearchParams.status === "archived" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="?status=archived">Archivés</Link>
        </Button>
      </div>

      {/* Stats */}
      <Suspense fallback={<LoadingSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Articles List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <ArticlesList searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}