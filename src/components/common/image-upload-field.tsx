// MIGRATED: Now uses UnifiedImageUpload with semantic HTML

"use client";

import { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useImageUploadField } from "./image-upload";
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
  context?: "product" | "magazine" | "avatar";
}

/**
 * Form field component for image upload using react-hook-form
 * Uses semantic HTML with proper ARIA labels
 */
export function ImageUploadField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required = false,
  uploadFunction,
  context = "product",
}: ImageUploadFieldProps<T>) {
  const { render } = useImageUploadField();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <fieldset>
            <legend className="sr-only">
              {label || "Image"} {required ? "(requis)" : "(optionnel)"}
            </legend>
            <FormControl>
              <section role="form" aria-label={`Upload ${label || "d'image"}`}>
                {render({
                  field,
                  uploadFunction,
                  context,
                  label,
                  required,
                })}
              </section>
            </FormControl>
            {description && (
              <p className="text-sm text-muted-foreground" id={`${name}-description`}>
                {description}
              </p>
            )}
            <FormMessage role="alert" />
          </fieldset>
        </FormItem>
      )}
    />
  );
}