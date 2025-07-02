"use client";

import React, { useState, useTransition } from "react";
import { useFormContext, useController, Control, Path } from "react-hook-form";
import { z } from "zod";
import { productSchema } from "@/lib/validators/product-validator";
import Image from "next/image";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { uploadProductImage } from "@/actions/productActions";
import { Card, CardContent } from "@/components/ui/card";
import { UploadIcon } from "@radix-ui/react-icons";

// Définir le type des valeurs du formulaire à partir du schéma Zod
type ProductFormValues = z.infer<typeof productSchema>;

interface ImageUploadFieldProps {
  control: Control<ProductFormValues>;
  name: Path<ProductFormValues>;
}

export function ImageUploadField({ control, name }: ImageUploadFieldProps) {
  const t = useTranslations("AdminProducts");
  const [isPending, startTransition] = useTransition();

  const { field } = useController({ name, control });
  const { setValue } = useFormContext();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  // ✅ Fix: Gérer la valeur null pour l'aperçu
  const [previewUrl, setPreviewUrl] = useState<string | null>((field.value as string) || null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Pre-fill filename input without extension
      setFileName(file.name.split(".").slice(0, -1).join("."));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("errorNoFileSelected"));
      return;
    }
    if (!fileName) {
      toast.error(t("errorNoFileName"));
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", fileName);

    startTransition(async () => {
      const result = await uploadProductImage(formData);

      // Gestion du résultat de l'upload
      if (!result.success) {
        // Cas 1: Erreur de permission (wrapper withPermissionSafe)
        toast.error(result.error || t("errorUploadFailed"));
        return;
      }

      // Cas 2: Résultat de l'action d'upload elle-même
      const uploadResult = result.data;
      if (uploadResult.success) {
        // Succès de l'upload
        toast.success(uploadResult.message);
        setValue(name, uploadResult.data.url, { shouldValidate: true, shouldDirty: true });
        setPreviewUrl(uploadResult.data.url);
      } else {
        // Échec de l'upload (validation, etc.)
        const errorMessage = uploadResult.errors
          ? Object.values(uploadResult.errors).flat().join("\n")
          : uploadResult.message;
        toast.error(errorMessage || t("errorUploadFailed"));
      }
    });
  };

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>{t("imageUrlLabel")}</FormLabel>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {previewUrl && (
                <div className="relative h-48 w-full overflow-hidden rounded-md border">
                  <Image
                    src={previewUrl}
                    alt={t("imagePreviewAlt")}
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <FormLabel htmlFor="file-upload" className="text-xs">
                    {t("imageFileLabel")}
                  </FormLabel>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel htmlFor="file-name" className="text-xs">
                    {t("imageNameLabel")}
                  </FormLabel>
                  <Input
                    id="file-name"
                    type="text"
                    placeholder={t("imageNamePlaceholder")}
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    disabled={!selectedFile}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || !fileName || isPending}
                className="w-full"
              >
                <UploadIcon className="mr-2 h-4 w-4" />
                {isPending ? t("uploading") : t("uploadButton")}
              </Button>

              <FormControl>
                <Input
                  name={field.name}
                  value={(field.value as string) ?? ""} // ✅ Fix: Convertir null/undefined en chaîne vide
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  type="url"
                  readOnly
                  className="bg-muted/50 mt-4 text-xs text-muted-foreground"
                  placeholder={t("imageUrlFinalPlaceholder")}
                />
              </FormControl>
            </CardContent>
          </Card>
          <FormDescription>{t("imageUrlDescription")}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
