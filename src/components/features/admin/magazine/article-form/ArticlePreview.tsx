"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TipTapViewer } from "@/components/features/magazine/tiptap-viewer";
import { Eye, Calendar, User, Tag as TagIcon } from "lucide-react";
import { TipTapContent, Category, Tag } from "@/types/magazine";

interface ArticleFormValues {
  title: string;
  excerpt: string;
  featured_image: string;
  category_id: string;
  content: TipTapContent;
}

interface ArticlePreviewProps {
  formValues: ArticleFormValues;
  categories: Category[];
  tags: Tag[];
  selectedTags: string[];
  authorName?: string;
}

export function ArticlePreview({
  formValues,
  categories,
  tags,
  selectedTags,
  authorName = "Auteur",
}: ArticlePreviewProps) {
  const selectedCategory = categories.find((c) => c.id === formValues.category_id);
  const articleTags = tags.filter((tag) => selectedTags.includes(tag.id));

  return (
    <article className="max-w-4xl mx-auto" role="main" aria-label="Aperçu de l'article">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-600">Aperçu de l'article</CardTitle>
          </div>

          {/* Image à la une */}
          {formValues.featured_image && (
            <div className="mb-6">
              <img
                src={formValues.featured_image}
                alt={formValues.title || "Image de l'article"}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Métadonnées */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{authorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <time dateTime={new Date().toISOString()}>
                {new Date().toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
            {selectedCategory && (
              <Badge variant="outline" className="flex items-center gap-1">
                <TagIcon className="h-3 w-3" />
                {selectedCategory.name}
              </Badge>
            )}
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold tracking-tight">
            {formValues.title || "Titre de l'article"}
          </h1>

          {/* Extrait */}
          {formValues.excerpt && (
            <p className="text-xl text-muted-foreground mt-4 leading-relaxed">
              {formValues.excerpt}
            </p>
          )}

          {/* Tags */}
          {articleTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {articleTags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Contenu de l'article */}
          <div className="prose prose-lg max-w-none">
            {formValues.content && Object.keys(formValues.content).length > 0 ? (
              <TipTapViewer content={formValues.content} />
            ) : (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Contenu en cours de rédaction</p>
                <p>L'aperçu du contenu apparaîtra ici lors de la saisie</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message d'aide */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Aperçu :</strong> Ceci est un aperçu de votre article tel qu'il apparaîtra aux lecteurs.
          Les modifications seront visibles en temps réel.
        </p>
      </div>
    </article>
  );
}