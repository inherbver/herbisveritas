import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleForm } from "@/components/features/admin/magazine/article-form";
import { getArticleById, getCategories, getTags } from "@/lib/magazine/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditArticlePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const _t = await getTranslations({ locale, namespace: "AdminMagazine" });

  // Récupération de l'article et des données pour le formulaire
  const [article, categories, tags] = await Promise.all([
    getArticleById(id),
    getCategories(),
    getTags(),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/magazine">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            <Badge
              variant={
                article.status === "published"
                  ? "default"
                  : article.status === "draft"
                    ? "secondary"
                    : "outline"
              }
            >
              {article.status === "published" && "Publié"}
              {article.status === "draft" && "Brouillon"}
              {article.status === "archived" && "Archivé"}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{article.title}</h1>
          <p className="text-muted-foreground">Modifiez votre article et gérez sa publication</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/magazine/${article.slug}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </Link>
          </Button>
        </div>
      </div>

      {/* Article Info */}
      <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
        <div>
          <span className="font-medium">Créé le:</span>{" "}
          {new Date(article.created_at!).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        {article.published_at && (
          <div>
            <span className="font-medium">Publié le:</span>{" "}
            {new Date(article.published_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
        <div>
          <span className="font-medium">Vues:</span> {article.view_count || 0}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Modifier l'article</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            }
          >
            <ArticleForm article={article} categories={categories} tags={tags} mode="edit" />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
