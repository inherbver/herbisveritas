"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormValues } from "@/lib/validators/product-validator";
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
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrashIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/actions/productActions";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { type ProductWithTranslations } from "@/lib/supabase/queries/products";

interface ProductFormProps {
  initialData?: ProductWithTranslations | null;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const t = useTranslations("AdminProducts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  const form = useForm<ProductFormValues>({
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
          is_active: initialData.is_active,
          is_new: initialData.is_new,
          is_on_promotion: initialData.is_on_promotion,
          translations:
            initialData.product_translations.length > 0
              ? initialData.product_translations.map((t) => ({
                  locale: t.locale,
                  name: t.name,
                  short_description: t.short_description || "",
                  description_long: t.description_long || "",
                  usage_instructions: t.usage_instructions || "",
                  properties: t.properties || "",
                  composition_text: t.composition_text || "",
                }))
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
      : {
          id: crypto.randomUUID(),
          slug: "",
          price: 0,
          stock: 0,
          unit: "",
          image_url: "",
          inci_list: [],
          is_active: true,
          is_new: false,
          is_on_promotion: false,
          translations: [
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
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "translations",
  });

  const onSubmit = (data: ProductFormValues) => {
    startTransition(async () => {
      try {
        const action = isEditMode ? updateProduct : createProduct;
        const result = await action(data);

        if (result.success) {
          const actionResult = result.data;

          if (actionResult.success) {
            toast.success(actionResult.message);
            router.push("/admin/products");
          } else {
            toast.error(actionResult.message || "Une erreur inattendue est survenue.");
            if (actionResult.errors) {
              console.error("Erreurs de validation:", actionResult.errors);
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
        <section aria-labelledby="general-info-title">
          <Card>
            <CardHeader>
              <CardTitle id="general-info-title">
                {isEditMode ? t("editProductTitle") : t("newProductTitle")}
              </CardTitle>
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
                          <Input {...field} disabled />
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
                        <Input placeholder="nom-du-produit" {...field} />
                      </FormControl>
                      <FormDescription>{t("slugDescription")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("priceLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="9.99"
                          value={field.value.toString()}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                        />
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
                      <FormLabel>{t("stockLabel")}</FormLabel>
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
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("unitLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder="ml, g, pièce..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ImageUploadField control={form.control} name="image_url" />
              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("activeLabel")}</FormLabel>
                        <FormDescription>{t("activeDescription")}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_new"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t("newLabel")}</FormLabel>
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
                        <FormLabel>{t("onPromotionLabel")}</FormLabel>
                        <FormDescription>{t("onPromotionDescription")}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="translations-title">
          <Card>
            <CardHeader>
              <CardTitle id="translations-title">{t("translations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="relative space-y-4 rounded-md border p-4">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`translations.${index}.locale`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("languageLabel")}</FormLabel>
                          <FormControl>
                            <Input placeholder="fr" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`translations.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("productNameLabel")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Savon doux à l'aloe vera" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`translations.${index}.short_description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("shortDescriptionLabel")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Un savon naturel pour une peau hydratée..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${index}.description_long`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("longDescriptionLabel")}</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder="Découvrez les bienfaits de notre savon..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${index}.usage_instructions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("usageInstructionsLabel")}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Appliquer sur peau humide..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${index}.properties`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("propertiesLabel")}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Hydratant, nourrissant..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`translations.${index}.composition_text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("compositionTextLabel")}</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Composition détaillée du produit..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute right-4 top-4"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
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
              >
                {t("addTranslation")}
              </Button>
            </CardContent>
          </Card>
        </section>

        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : isEditMode ? t("updateButton") : t("createButton")}
        </Button>
      </form>
    </Form>
  );
}
