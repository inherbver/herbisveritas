"use client";

import { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Upload, Link2, X, Loader2 } from "lucide-react";
import type { UploadImageResult } from "@/lib/storage/image-upload";
import type { ActionResult } from "@/lib/core/result";

interface ImageUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  uploadFunction: (formData: FormData) => Promise<ActionResult<UploadImageResult>>;
  translationKey?: string;
}

export function ImageUploadField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "https://exemple.com/image.jpg",
  required = false,
  uploadFunction,
  translationKey = "Common",
}: ImageUploadFieldProps<T>) {
  const t = useTranslations(translationKey);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File, onChange: (url: string) => void) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.split(".")[0]);

      const result = await uploadFunction(formData);

      if (result.success) {
        onChange(result.data!.url);
        toast.success(result.message || "Image téléchargée avec succès");
      } else {
        toast.error(result.error || "Erreur lors du téléchargement");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléversement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {label || "Image"}
            {required && <span className="text-red-500">*</span>}
          </FormLabel>
          <FormControl>
            <div className="space-y-4">
              {/* URL Input */}
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={placeholder}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || "")}
                  className="flex-1"
                />
                {field.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange("")}
                    className="px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* File Upload */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, field.onChange);
                      }
                    }}
                    disabled={isUploading}
                    className="hover:file:bg-primary/90 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  className="shrink-0"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Téléversement...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Téléverser
                    </>
                  )}
                </Button>
              </div>

              {/* Image Preview */}
              {field.value && (
                <div className="mt-4">
                  <div className="group relative inline-block">
                    <img
                      src={field.value}
                      alt="Aperçu de l'image"
                      className="h-48 w-auto rounded-lg border border-border object-cover shadow-sm"
                      onError={() => {
                        console.error("Erreur de chargement de l'image:", field.value);
                        toast.error("Impossible de charger l'image");
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-colors group-hover:bg-black/20 group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => field.onChange("")}
                        className="opacity-90"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Formats supportés: JPEG, PNG, WebP, GIF (max 4Mo)
                  </p>
                </div>
              )}
            </div>
          </FormControl>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
