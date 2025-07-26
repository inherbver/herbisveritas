import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleForm } from "@/components/admin/magazine/article-form";
import { getCategories, getTags } from "@/lib/magazine/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewArticlePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const _t = await getTranslations({ locale, namespace: "AdminMagazine" });

  // Récupération des données pour le formulaire
  const [categories, tags] = await Promise.all([getCategories(), getTags()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold">Nouvel article</h1>
        <p className="text-muted-foreground">Créez un nouveau contenu pour votre magazine</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'article</CardTitle>
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
            <ArticleForm categories={categories} tags={tags} mode="create" />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
