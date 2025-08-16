// MIGRATED: Now uses UnifiedImageUpload with semantic HTML

"use client";

import { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UnifiedImageUpload } from "@/components/common/image-upload";
import { uploadMagazineImage } from "@/actions/magazineActions";

interface MagazineImageUploadFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

export function MagazineImageUploadField<T extends FieldValues>({
  control,
  name,
  label = "Image",
}: MagazineImageUploadFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <UnifiedImageUpload
              context="magazine"
              currentValue={field.value || ""}
              onUploadSuccess={(url) => field.onChange(url)}
              uploadFunction={uploadMagazineImage}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}