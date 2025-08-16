// REFACTORED: Decomposed into semantic sub-components for better maintainability

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AutoSaveEditor } from "@/components/features/magazine/auto-save-editor";
import { createArticle, updateArticle } from "@/actions/magazineActions";
import { ArticleDisplay, Category, Tag, ArticleFormData, TipTapContent } from "@/types/magazine";

import { ArticleFormFields } from "./ArticleFormFields";
import { ArticleTagsManager } from "./ArticleTagsManager";
import { ArticlePreview } from "./ArticlePreview";
import { ArticleFormActions } from "./ArticleFormActions";

// Schema de validation avec TipTapContent correct
const tipTapContentSchema: z.ZodType<TipTapContent> = z.lazy(() =>
  z.object({
    type: z.string(),
    content: z.array(tipTapContentSchema).optional(),
    attrs: z.record(z.unknown()).optional(),
    text: z.string().optional(),
    marks: z
      .array(
        z.object({
          type: z.string(),
          attrs: z.record(z.unknown()).optional(),
        })
      )
      .optional(),
  })
);

const articleSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  slug: z.string().min(1, "Le slug est requis"),
  excerpt: z.string().optional(),
  content: tipTapContentSchema,
  featured_image: z.string().optional(),
  category_id: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  article?: ArticleDisplay;
  categories: Category[];
  tags: Tag[];
  mode: "create" | "edit";
}

export function ArticleForm({ article, categories, tags, mode }: ArticleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>(
    article?.tags?.map((tag) => tag.id) || []
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || "",
      slug: article?.slug || "",
      excerpt: article?.excerpt || "",
      content: article?.content || { type: "doc", content: [] },
      featured_image: article?.featured_image || "",
      category_id: article?.category_id || "",
      seo_title: article?.seo_title || "",
      seo_description: article?.seo_description || "",
      status: article?.status || "draft",
    },
    mode: "onChange",
  });

  const {
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = form;

  const watchedContent = watch("content");
  const watchedTitle = watch("title");
  const watchedStatus = watch("status");

  const handleTitleChange = (value: string) => {
    setIsDirty(true);
  };

  const handleContentChange = (content: TipTapContent) => {
    setValue("content", content);
    setIsDirty(true);
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    setIsDirty(true);
  };

  // Auto-sauvegarde pour les brouillons
  const handleAutoSave = async () => {
    if (mode === "edit" && article && watchedStatus === "draft") {
      try {
        const formData: ArticleFormData = {
          title: watchedTitle,
          slug: watch("slug"),
          excerpt: watch("excerpt"),
          content: watchedContent,
          featured_image: watch("featured_image"),
          category_id: watch("category_id"),
          seo_title: watch("seo_title"),
          seo_description: watch("seo_description"),
          status: watchedStatus,
          tags: selectedTags,
        };

        await updateArticle(article.id, formData);
        setIsDirty(false);
        toast.success("Brouillon sauvegardé automatiquement");
      } catch (error) {
        console.error("Erreur auto-sauvegarde:", error);
      }
    }
  };

  const onSubmit = async (data: ArticleFormValues) => {
    startTransition(async () => {
      try {
        const formData: ArticleFormData = {
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          featured_image: data.featured_image,
          category_id: data.category_id,
          seo_title: data.seo_title,
          seo_description: data.seo_description,
          status: data.status,
          tags: selectedTags,
        };

        let result;
        if (mode === "create") {
          result = await createArticle(formData);
        } else if (article) {
          result = await updateArticle(article.id, formData);
        }

        if (result?.success) {
          setIsDirty(false);
          toast.success(
            mode === "create" 
              ? "Article créé avec succès" 
              : "Article mis à jour avec succès"
          );
          
          if (mode === "create") {
            router.push("/admin/magazine");
          }
        } else {
          toast.error(result?.error || "Erreur lors de la sauvegarde");
        }
      } catch (error) {
        console.error("Erreur soumission:", error);
        toast.error("Erreur inattendue lors de la sauvegarde");
      }
    });
  };

  const handleStatusChange = (status: "draft" | "published" | "archived") => {
    setValue("status", status);
    setIsDirty(true);
  };

  const handlePreviewToggle = () => {
    setPreviewMode(!previewMode);
  };

  return (
    <main className="container mx-auto py-6 space-y-8" role="main">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "create" ? "Créer un article" : `Modifier: ${article?.title}`}
        </h1>
        <p className="text-muted-foreground mt-2">
          {mode === "create" 
            ? "Rédigez et publiez un nouvel article pour votre magazine"
            : "Modifiez les détails et le contenu de cet article"
          }
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Contenu principal */}
            <section className="lg:col-span-3 space-y-8" aria-label="Contenu de l'article">
              <Tabs value={previewMode ? "preview" : "edit"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit" onClick={() => setPreviewMode(false)}>
                    Édition
                  </TabsTrigger>
                  <TabsTrigger value="preview" onClick={() => setPreviewMode(true)}>
                    Aperçu
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-8">
                  {/* Champs du formulaire */}
                  <ArticleFormFields
                    control={form.control}
                    watch={watch}
                    setValue={setValue}
                    categories={categories}
                    onTitleChange={handleTitleChange}
                    mode={mode}
                  />

                  {/* Éditeur de contenu */}
                  <section aria-label="Contenu de l'article">
                    <h2 className="text-lg font-semibold mb-4">Contenu de l'article</h2>
                    <AutoSaveEditor
                      content={watchedContent}
                      onChange={handleContentChange}
                      onAutoSave={watchedStatus === "draft" ? handleAutoSave : undefined}
                      placeholder="Commencez à écrire votre article..."
                    />
                    {errors.content && (
                      <p className="text-sm text-red-500 mt-2" role="alert">
                        {errors.content.message}
                      </p>
                    )}
                  </section>

                  {/* Gestion des tags */}
                  <ArticleTagsManager
                    tags={tags}
                    selectedTags={selectedTags}
                    onTagsChange={handleTagsChange}
                  />
                </TabsContent>

                <TabsContent value="preview">
                  <ArticlePreview
                    formValues={watch()}
                    categories={categories}
                    tags={tags}
                    selectedTags={selectedTags}
                    authorName="Votre nom" // TODO: Get from auth context
                  />
                </TabsContent>
              </Tabs>
            </section>

            {/* Barre latérale d'actions */}
            <ArticleFormActions
              mode={mode}
              status={watchedStatus}
              isDirty={isDirty}
              isPending={isPending}
              previewMode={previewMode}
              onStatusChange={handleStatusChange}
              onPreviewToggle={handlePreviewToggle}
              onSubmit={handleSubmit(onSubmit)}
              onAutoSave={watchedStatus === "draft" ? handleAutoSave : undefined}
            />
          </div>
        </form>
      </Form>
    </main>
  );
}