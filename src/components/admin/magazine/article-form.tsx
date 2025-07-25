"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AutoSaveEditor } from "@/components/magazine/auto-save-editor";
import { TipTapViewer } from "@/components/magazine/tiptap-viewer";
import { MagazineImageUploadField } from "@/components/admin/magazine/image-upload-field";
import { createArticle, updateArticle } from "@/actions/magazineActions";
import { ArticleDisplay, Category, Tag, ArticleFormData } from "@/types/magazine";

import { 
  Save, 
  Eye, 
  Send, 
  Archive, 
  X, 
  Plus,
  AlertCircle,
  Clock,
  Hash,
  Image as ImageIcon
} from "lucide-react";

// Schema de validation
const articleSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(255, "Titre trop long"),
  slug: z.string().optional(),
  excerpt: z.string().max(500, "L'extrait ne peut pas dépasser 500 caractères").optional(),
  content: z.any().refine((val) => val && val.content, "Le contenu est requis"),
  featured_image: z.string().url("URL d'image invalide").optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]),
  category_id: z.string().optional(),
  tag_ids: z.array(z.string()).optional(),
  seo_title: z.string().max(60, "Titre SEO trop long").optional(),
  seo_description: z.string().max(160, "Description SEO trop longue").optional(),
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
    article?.tags?.map(tag => tag.id) || []
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
      status: (article?.status as "draft" | "published" | "archived") || "draft",
      category_id: article?.category_id || "",
      tag_ids: selectedTags,
      seo_title: article?.seo_title || "",
      seo_description: article?.seo_description || "",
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
  const watchedContent = watch("content");
  const watchedTitle = watch("title");
  const watchedStatus = watch("status");

  // Génération automatique du slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setValue("title", value);
    if (!form.watch("slug") || mode === "create") {
      setValue("slug", generateSlug(value));
    }
    setIsDirty(true);
  };

  const handleContentChange = (content: any) => {
    setValue("content", content);
    setIsDirty(true);
  };

  const addTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      const newTags = [...selectedTags, tagId];
      setSelectedTags(newTags);
      setValue("tag_ids", newTags);
      setIsDirty(true);
    }
  };

  const removeTag = (tagId: string) => {
    const newTags = selectedTags.filter(id => id !== tagId);
    setSelectedTags(newTags);
    setValue("tag_ids", newTags);
    setIsDirty(true);
  };

  // Auto-sauvegarde pour les brouillons
  const handleAutoSave = async (content: any) => {
    if (mode === "edit" && article && watchedStatus === "draft") {
      try {
        const formData: ArticleFormData = {
          ...form.getValues(),
          content,
          tag_ids: selectedTags,
        };
        await updateArticle(article.id, formData);
      } catch (error) {
        console.error("Erreur auto-save:", error);
      }
    }
  };

  const onSubmit = async (data: ArticleFormValues) => {
    startTransition(async () => {
      try {
        const formData: ArticleFormData = {
          ...data,
          content: data.content || { type: "doc", content: [] },
          tag_ids: selectedTags,
          featured_image: data.featured_image || undefined,
          excerpt: data.excerpt || undefined,
          seo_title: data.seo_title || undefined,
          seo_description: data.seo_description || undefined,
          category_id: data.category_id || undefined,
        };

        let result;
        if (mode === "create") {
          result = await createArticle(formData);
        } else if (article) {
          result = await updateArticle(article.id, formData);
        }

        if (result?.success) {
          toast.success(
            mode === "create" 
              ? "Article créé avec succès" 
              : "Article mis à jour avec succès"
          );
          setIsDirty(false);
          
          if (mode === "create") {
            router.push("/admin/magazine");
          } else {
            router.refresh();
          }
        } else {
          toast.error(result?.error || "Une erreur est survenue");
        }
      } catch (error) {
        toast.error("Erreur lors de la sauvegarde");
        console.error("Erreur:", error);
      }
    });
  };

  const handleStatusChange = (status: "draft" | "published" | "archived") => {
    setValue("status", status);
    setIsDirty(true);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              watchedStatus === "published" ? "default" :
              watchedStatus === "draft" ? "secondary" :
              "outline"
            }
          >
            {watchedStatus === "published" && "Publié"}
            {watchedStatus === "draft" && "Brouillon"}
            {watchedStatus === "archived" && "Archivé"}
          </Badge>
          {isDirty && (
            <Badge variant="outline" className="text-orange-600">
              <Clock className="h-3 w-3 mr-1" />
              Non sauvegardé
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Éditer" : "Aperçu"}
          </Button>

          <Select value={watchedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="published">Publier</SelectItem>
              <SelectItem value="archived">Archiver</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="submit"
            disabled={isPending}
            className="min-w-[100px]"
          >
            {isPending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sauvegarde...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // Mode aperçu
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">{watchedTitle || "Titre de l'article"}</h1>
            {form.watch("excerpt") && (
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {form.watch("excerpt")}
              </p>
            )}
            {form.watch("featured_image") && (
              <img
                src={form.watch("featured_image")}
                alt={watchedTitle}
                className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
              />
            )}
          </div>
          <TipTapViewer content={watchedContent} />
        </div>
      ) : (
        // Mode édition
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={watchedTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Saisissez le titre de votre article"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 rounded-l-md">
                  /magazine/
                </span>
                <Input
                  id="slug"
                  {...form.register("slug")}
                  placeholder="url-de-larticle"
                  className="rounded-l-none"
                />
              </div>
              {errors.slug && (
                <p className="text-sm text-red-500">{errors.slug.message}</p>
              )}
            </div>

            {/* Extrait */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Extrait</Label>
              <Textarea
                id="excerpt"
                {...form.register("excerpt")}
                placeholder="Résumé de votre article (généré automatiquement si vide)"
                rows={3}
                className={errors.excerpt ? "border-red-500" : ""}
              />
              {errors.excerpt && (
                <p className="text-sm text-red-500">{errors.excerpt.message}</p>
              )}
            </div>

            {/* Éditeur de contenu */}
            <div className="space-y-2">
              <Label>Contenu *</Label>
              <AutoSaveEditor
                content={watchedContent}
                onChange={handleContentChange}
                onAutoSave={handleAutoSave}
                placeholder="Commencez à écrire votre article..."
                storageKey={`article-${article?.id || "new"}`}
              />
              {errors.content && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Le contenu est requis</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Image mise en avant */}
              <MagazineImageUploadField
                control={form.control}
                name="featured_image"
                label="Image mise en avant"
                description="Choisissez une image qui représente bien votre article"
                placeholder="https://example.com/image.jpg"
              />

              {/* Catégorie */}
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={form.watch("category_id")}
                  onValueChange={(value) => {
                    setValue("category_id", value);
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune catégorie</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || "#6B7280" }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag ? (
                    <Badge key={tagId} variant="secondary" className="gap-1">
                      <Hash className="h-3 w-3" />
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tagId)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
              <Select onValueChange={addTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Ajouter un tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags
                    .filter(tag => !selectedTags.includes(tag.id))
                    .map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3" />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">Titre SEO</Label>
                <Input
                  id="seo_title"
                  {...form.register("seo_title")}
                  placeholder="Titre optimisé pour les moteurs de recherche"
                  className={errors.seo_title ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {form.watch("seo_title")?.length || 0}/60 caractères
                </p>
                {errors.seo_title && (
                  <p className="text-sm text-red-500">{errors.seo_title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_description">Description SEO</Label>
                <Textarea
                  id="seo_description"
                  {...form.register("seo_description")}
                  placeholder="Description qui apparaîtra dans les résultats de recherche"
                  rows={3}
                  className={errors.seo_description ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {form.watch("seo_description")?.length || 0}/160 caractères
                </p>
                {errors.seo_description && (
                  <p className="text-sm text-red-500">{errors.seo_description.message}</p>
                )}
              </div>

              {/* Aperçu SEO */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aperçu SEO</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                      {form.watch("seo_title") || watchedTitle || "Titre de l'article"}
                    </div>
                    <div className="text-green-700 text-sm">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://herbisveritas.com'}/magazine/{form.watch("slug") || "url-article"}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {form.watch("seo_description") || form.watch("excerpt") || "Description de l'article..."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
      </form>
    </Form>
  );
}