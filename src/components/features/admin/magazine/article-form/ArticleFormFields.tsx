"use client";

import { Control, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "@/components/common/image-upload-field";
import { uploadMagazineImageAction } from "@/actions/magazineActions";
import { Category } from "@/types/magazine";

interface ArticleFormValues {
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  category_id: string;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published" | "archived";
  content: any;
}

interface ArticleFormFieldsProps {
  control: Control<ArticleFormValues>;
  watch: UseFormWatch<ArticleFormValues>;
  setValue: UseFormSetValue<ArticleFormValues>;
  categories: Category[];
  onTitleChange: (value: string) => void;
  mode: "create" | "edit";
}

// Fonction utilitaire pour générer un slug
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^\w\s-]/g, "") // Supprime les caractères spéciaux
    .replace(/\s+/g, "-") // Remplace les espaces par des tirets
    .replace(/--+/g, "-") // Supprime les tirets multiples
    .trim();
};

export function ArticleFormFields({
  control,
  watch,
  setValue,
  categories,
  onTitleChange,
  mode,
}: ArticleFormFieldsProps) {
  const watchedTitle = watch("title");
  const watchedSlug = watch("slug");

  const handleTitleChange = (value: string) => {
    setValue("title", value);
    // Auto-générer le slug si c'est un nouvel article ou si le slug n'a pas été modifié manuellement
    if (mode === "create" || !watchedSlug || watchedSlug === generateSlug(watchedTitle)) {
      setValue("slug", generateSlug(value));
    }
    onTitleChange(value);
  };

  return (
    <section aria-label="Champs du formulaire article">
      <div className="grid gap-6">
        {/* Titre et Slug */}
        <fieldset className="grid gap-4">
          <legend className="text-lg font-semibold">Informations principales</legend>
          
          <div>
            <Label htmlFor="title">
              Titre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={watchedTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Titre de l'article"
              required
              aria-describedby="title-help"
            />
            <p id="title-help" className="text-sm text-muted-foreground mt-1">
              Le titre apparaîtra sur la page d'accueil et dans les résultats de recherche
            </p>
          </div>

          <div>
            <Label htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <Input
              id="slug"
              value={watchedSlug}
              onChange={(e) => setValue("slug", e.target.value)}
              placeholder="slug-de-l-article"
              required
              aria-describedby="slug-help"
            />
            <p id="slug-help" className="text-sm text-muted-foreground mt-1">
              L'URL de l'article. Généré automatiquement à partir du titre.
            </p>
          </div>
        </fieldset>

        {/* Extrait */}
        <fieldset>
          <legend className="text-lg font-semibold">Description</legend>
          
          <div>
            <Label htmlFor="excerpt">Extrait</Label>
            <Textarea
              id="excerpt"
              value={watch("excerpt")}
              onChange={(e) => setValue("excerpt", e.target.value)}
              placeholder="Courte description de l'article..."
              rows={3}
              aria-describedby="excerpt-help"
            />
            <p id="excerpt-help" className="text-sm text-muted-foreground mt-1">
              Apparaît dans les aperçus et sur les réseaux sociaux
            </p>
          </div>
        </fieldset>

        {/* Image et Catégorie */}
        <fieldset className="grid gap-4">
          <legend className="text-lg font-semibold">Média et classification</legend>
          
          <div>
            <ImageUploadField
              control={control}
              name="featured_image"
              label="Image à la une"
              uploadFunction={uploadMagazineImageAction}
              context="magazine"
            />
          </div>

          <div>
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={watch("category_id")}
              onValueChange={(value) => setValue("category_id", value)}
            >
              <SelectTrigger id="category" aria-describedby="category-help">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="category-help" className="text-sm text-muted-foreground mt-1">
              Aide à organiser et filtrer les articles
            </p>
          </div>
        </fieldset>

        {/* SEO */}
        <fieldset className="grid gap-4">
          <legend className="text-lg font-semibold">Optimisation SEO</legend>
          
          <div>
            <Label htmlFor="seo_title">Titre SEO</Label>
            <Input
              id="seo_title"
              value={watch("seo_title")}
              onChange={(e) => setValue("seo_title", e.target.value)}
              placeholder="Titre optimisé pour les moteurs de recherche"
              maxLength={60}
              aria-describedby="seo-title-help"
            />
            <p id="seo-title-help" className="text-sm text-muted-foreground mt-1">
              Recommandé : 50-60 caractères
            </p>
          </div>

          <div>
            <Label htmlFor="seo_description">Description SEO</Label>
            <Textarea
              id="seo_description"
              value={watch("seo_description")}
              onChange={(e) => setValue("seo_description", e.target.value)}
              placeholder="Description pour les moteurs de recherche"
              maxLength={160}
              rows={2}
              aria-describedby="seo-desc-help"
            />
            <p id="seo-desc-help" className="text-sm text-muted-foreground mt-1">
              Recommandé : 150-160 caractères
            </p>
          </div>
        </fieldset>
      </div>
    </section>
  );
}