"use client";

import { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { uploadMagazineImage } from "@/actions/magazineActions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Upload, Link2, X, Loader2 } from "lucide-react";

interface MagazineImageUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
}

export function MagazineImageUploadField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "https://exemple.com/image.jpg",
  required = false,
}: MagazineImageUploadFieldProps<T>) {
  const t = useTranslations("AdminMagazine");
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File, onChange: (url: string) => void) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.split(".")[0]);

      const result = await uploadMagazineImage(formData);

      if (result.success) {
        onChange(result.data.url);
        toast.success(result.message);
      } else {
        toast.error(result.message);
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
            {label || "Image à la une"}
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
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={isUploading}
                  className="shrink-0"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? t("upload.uploading") : t("upload.uploadButton")}
                </Button>
              </div>

              {/* Image Preview */}
              {field.value && (
                <div className="mt-4">
                  <div className="relative group inline-block">
                    <img
                      src={field.value}
                      alt="Aperçu de l'image"
                      className="h-48 w-auto rounded-lg object-cover border border-border shadow-sm"
                      onError={() => {
                        console.error("Erreur de chargement de l'image:", field.value);
                        toast.error("Impossible de charger l'image");
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => field.onChange("")}
                        className="opacity-90"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("upload.remove")}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("upload.supportedFormats")}
                  </p>
                </div>
              )}
            </div>
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}