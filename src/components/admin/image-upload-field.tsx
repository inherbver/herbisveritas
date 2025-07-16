import { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { uploadProductImage } from "@/actions/productActions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ImageUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
}

export function ImageUploadField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: ImageUploadFieldProps<T>) {
  const t = useTranslations("AdminProducts");
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File, onChange: (url: string) => void) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.split(".")[0]);

      const result = await uploadProductImage(formData);

      if (result.success) {
        const actionResult = result.data;
        if (actionResult.success) {
          onChange(actionResult.data.url);
          toast.success(actionResult.message);
        } else {
          toast.error(actionResult.message);
        }
      } else {
        toast.error(result.error || "Erreur lors du téléversement");
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
          <FormLabel>{label || t("imageLabel")}</FormLabel>
          <FormControl>
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://exemple.com/image.jpg"
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value || "")}
              />
              <div className="flex items-center space-x-2">
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
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                >
                  {isUploading ? t("uploading") : t("uploadButton")}
                </Button>
              </div>
              {field.value && (
                <div className="mt-2">
                  <img
                    src={field.value}
                    alt="Aperçu"
                    className="h-32 w-32 rounded-md object-cover"
                  />
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