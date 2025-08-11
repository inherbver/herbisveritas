"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  type ProductFormValues,
  getDefaultProductValues,
} from "@/lib/validators/product-validator";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PRODUCT_STATUS_GROUPS, ProductStatus } from "@/types/product-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Languages, Package, Tag, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/actions/productActions";
import { ImageUploadField } from "@/components/common/image-upload-field";
import { uploadProductImageCore } from "@/lib/storage/image-upload";
import { type ProductWithTranslations } from "@/lib/supabase/queries/products";
import { type Database } from "@/types/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ProductFormProps {
  initialData?: ProductWithTranslations | null;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const t = useTranslations("AdminProducts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          id: initialData.id,
          slug: initialData.slug,
          price: initialData.price ?? 0,
          stock: initialData.stock ?? 0,
          unit: initialData.unit ?? "",
          image_url: initialData.image_url ?? "",
          inci_list: initialData.inci_list ?? [],
          status: (initialData.status as ProductStatus) || "active",
          is_active: initialData.is_active,
          is_new: initialData.is_new ?? false,
          is_on_promotion: initialData.is_on_promotion ?? false,
          translations:
            initialData.product_translations.length > 0
              ? initialData.product_translations.map(
                  (t: Database["public"]["Tables"]["product_translations"]["Row"]) => ({
                    locale: t.locale,
                    name: t.name,
                    short_description: t.short_description || "",
                    description_long: t.description_long || "",
                    usage_instructions: t.usage_instructions || "",
                    properties: t.properties || "",
                    composition_text: t.composition_text || "",
                  })
                )
              : [
                  {
                    locale: "fr",
                    name: "",
                    short_description: "",
                    description_long: "",
                    usage_instructions: "",
                    properties: "",
                    composition_text: "",
                  },
                ],
        }
      : getDefaultProductValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "translations",
  });

  const {
    fields: inciFields,
    append: appendInci,
    remove: removeInci,
  } = useFieldArray({
    control: form.control,
    name: "inci_list" as never,
  });

  const onSubmit = (data: ProductFormValues) => {
    startTransition(async () => {
      try {
        // Synchroniser status et is_active pour la compatibilité
        const dataWithSync = {
          ...data,
          is_active: data.status === "active",
        };

        const action = isEditMode ? updateProduct : createProduct;
        const result = await action(dataWithSync);

        if (result.success) {
          const actionResult = result.data;

          if (actionResult.success) {
            toast.success(actionResult.message);
            router.push("/admin/products");
          } else {
            toast.error(actionResult.message || "Une erreur inattendue est survenue.");
            if (actionResult.error) {
              console.error("Erreurs de validation:", actionResult.error);
            }
          }
        } else {
          toast.error(result.error || "Action non autorisée.");
        }
      } catch (error) {
        console.error("Submission error:", error);
        toast.error("Une erreur critique est survenue lors de la soumission du formulaire.");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* En-tête avec actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? t("editProductTitle") : t("newProductTitle")}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? "Modifiez les informations du produit"
                : "Créez un nouveau produit pour votre catalogue"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : isEditMode ? t("updateButton") : t("createButton")}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="translations" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Traductions
            </TabsTrigger>
            <TabsTrigger value="composition" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Composition
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Avancé
            </TabsTrigger>
          </TabsList>

          {/* Onglet Général */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Informations principales
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Les informations essentielles qui apparaissent sur la carte produit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image en premier - c'est ce que voit l'utilisateur en premier */}
                <ImageUploadField
                  control={form.control}
                  name="image_url"
                  uploadFunction={uploadProductImageCore}
                />

                {/* Prix et Stock - informations critiques */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">{t("priceLabel")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="9.99"
                              value={field.value.toString()}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                field.onChange(isNaN(value) ? 0 : value);
                              }}
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              €
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">{t("stockLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            value={field.value.toString()}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Unité - information d'affichage */}
                <div className="space-y-4">
                  <FormLabel className="text-base font-medium">{t("unitLabel")}</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => {
                        const unitValue = field.value || "";
                        const numericMatch = unitValue.match(/^(\d+(?:\.\d+)?)/);
                        const unitMatch = unitValue.match(/([a-zA-Z()]+)$/);

                        const numericValue = numericMatch ? numericMatch[1] : "";
                        const unitType = unitMatch ? unitMatch[1] : "unité(s)";

                        return (
                          <>
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="250"
                                  value={numericValue}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    field.onChange(newValue ? `${newValue} ${unitType}` : "");
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                            <FormItem className="w-32">
                              <FormControl>
                                <Select
                                  value={unitType}
                                  onValueChange={(newUnitType) => {
                                    field.onChange(
                                      numericValue ? `${numericValue} ${newUnitType}` : ""
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gr">gr</SelectItem>
                                    <SelectItem value="ml">ml</SelectItem>
                                    <SelectItem value="unité(s)">unité(s)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          </>
                        );
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quantité et unité affichées sur la carte produit (ex: "250 ml", "2 unité(s)")
                  </p>
                </div>

                {/* Badges et statut */}
                <div className="space-y-4">
                  <FormLabel className="text-base font-medium">Badges et visibilité</FormLabel>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="is_new"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">
                                NOUVEAU
                              </Badge>
                              {t("newLabel")}
                            </FormLabel>
                            <FormDescription>{t("newDescription")}</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_on_promotion"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                PROMO
                              </Badge>
                              {t("onPromotionLabel")}
                            </FormLabel>
                            <FormDescription>{t("onPromotionDescription")}</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Statut */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Statut du produit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un statut" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_STATUS_GROUPS.map((statusGroup) => (
                            <SelectItem key={statusGroup.id} value={statusGroup.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    statusGroup.color === "green"
                                      ? "bg-green-500"
                                      : statusGroup.color === "orange"
                                        ? "bg-orange-500"
                                        : "bg-gray-500"
                                  }`}
                                />
                                <span>{statusGroup.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  - {statusGroup.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Définit la visibilité et l'état du produit dans l'administration et la
                        boutique.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Traductions */}
          <TabsContent value="translations" className="space-y-6">
            {fields.length > 0 && (
              <Tabs defaultValue={fields[0]?.locale || "fr"} className="space-y-6">
                <div className="flex items-center justify-between">
                  <TabsList>
                    {fields.map((field, index) => {
                      const locale =
                        form.watch(`translations.${index}.locale`) || `Langue ${index + 1}`;
                      return (
                        <TabsTrigger
                          key={field.id}
                          value={locale}
                          className="flex items-center gap-2"
                        >
                          <Languages className="h-4 w-4" />
                          {locale.toUpperCase()}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        locale: "",
                        name: "",
                        short_description: "",
                        description_long: "",
                        usage_instructions: "",
                        properties: "",
                        composition_text: "",
                      })
                    }
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("addTranslation")}
                  </Button>
                </div>

                {fields.map((field, index) => {
                  const locale =
                    form.watch(`translations.${index}.locale`) || `Langue ${index + 1}`;
                  return (
                    <TabsContent key={field.id} value={locale}>
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Languages className="h-5 w-5" />
                                Contenu en {locale.toUpperCase()}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Textes qui apparaîtront aux utilisateurs dans cette langue
                              </p>
                            </div>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => remove(index)}
                                className="flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Supprimer
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Langue et nom - informations de base */}
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`translations.${index}.locale`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">
                                    {t("languageLabel")}
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une langue" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                                      <SelectItem value="en">🇬🇧 English</SelectItem>
                                      <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                                      <SelectItem value="es">🇪🇸 Español</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`translations.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">
                                    {t("productNameLabel")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="Savon doux à l'aloe vera" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Nom qui apparaît sur la carte produit et les pages de détail
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Description courte - apparaît sur la carte */}
                          <FormField
                            control={form.control}
                            name={`translations.${index}.short_description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">
                                  {t("shortDescriptionLabel")}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Un savon naturel pour une peau hydratée et nourrie..."
                                    rows={2}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Description courte affichée sur la carte produit (2-3 lignes max)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Description longue - page de détail */}
                          <FormField
                            control={form.control}
                            name={`translations.${index}.description_long`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">
                                  {t("longDescriptionLabel")}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    rows={5}
                                    placeholder="Découvrez les bienfaits exceptionnels de notre savon artisanal à l'aloe vera. Formulé avec des ingrédients naturels soigneusement sélectionnés..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Description détaillée affichée dans l'onglet "Description" de la
                                  page produit
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Propriétés - onglet propriétés */}
                          <FormField
                            control={form.control}
                            name={`translations.${index}.properties`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">
                                  {t("propertiesLabel")}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="• Hydratant et nourrissant\n• Convient aux peaux sensibles\n• Action apaisante\n• 100% naturel"
                                    rows={4}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Liste des propriétés affichées dans l'onglet "Propriétés" (une par
                                  ligne)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Instructions d'usage - onglet usage */}
                          <FormField
                            control={form.control}
                            name={`translations.${index}.usage_instructions`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">
                                  {t("usageInstructionsLabel")}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Appliquer sur peau humide, faire mousser délicatement et rincer à l'eau claire. Usage quotidien pour visage et corps."
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Mode d'emploi affiché dans l'onglet "Utilisation"
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Texte de composition - onglet composition */}
                          <FormField
                            control={form.control}
                            name={`translations.${index}.composition_text`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">
                                  {t("compositionTextLabel")}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ce savon est élaboré selon des méthodes traditionnelles avec des huiles végétales biologiques et de l'aloe vera frais..."
                                    rows={4}
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Texte descriptif de la composition affiché dans l'onglet
                                  "Composition"
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </TabsContent>

          {/* Onglet Composition */}
          <TabsContent value="composition" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Liste INCI
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  International Nomenclature of Cosmetic Ingredients - Liste officielle des
                  ingrédients
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base font-medium">Ingrédients</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendInci("")}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un ingrédient
                  </Button>
                </div>

                {inciFields.length > 0 ? (
                  <div className="space-y-3">
                    {inciFields.map((field, inciIndex) => (
                      <div key={field.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <span className="w-8 font-mono text-sm text-muted-foreground">
                          {inciIndex + 1}.
                        </span>
                        <FormField
                          control={form.control}
                          name={`inci_list.${inciIndex}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder={
                                    inciIndex === 0
                                      ? "Aqua"
                                      : inciIndex === 1
                                        ? "Sodium Cocoate"
                                        : "Nom INCI de l'ingrédient"
                                  }
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInci(inciIndex)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Tag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <h3 className="mb-1 text-sm font-medium">Aucun ingrédient ajouté</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Ajoutez les ingrédients dans l'ordre décroissant de concentration
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendInci("")}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter le premier ingrédient
                    </Button>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="mb-2 text-sm font-medium">💡 Conseil</h4>
                  <p className="text-sm text-muted-foreground">
                    Listez les ingrédients par ordre décroissant de concentration. Les ingrédients
                    présents à plus de 1% doivent être listés en premier.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Avancé */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configuration technique
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Paramètres avancés pour le référencement et l'administration
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {isEditMode && (
                    <FormField
                      control={form.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("productIdLabel")}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled className="bg-muted" />
                          </FormControl>
                          <FormDescription>{t("productIdDescription")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("slugLabel")}</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                              /products/
                            </span>
                            <Input
                              placeholder="savon-aloe-vera"
                              {...field}
                              className="rounded-l-none"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>{t("slugDescription")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
