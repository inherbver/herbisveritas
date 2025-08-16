// DEPRECATED: Use UnifiedImageUpload instead
// This component is kept for backward compatibility

"use client";

import { UnifiedImageUpload } from "./image-upload";
import type { UploadImageResult } from "@/lib/storage/image-upload";
import type { ActionResult } from "@/lib/core/result";

interface ImageUploadButtonProps {
  onUploadSuccess: (url: string) => void;
  uploadFunction: (formData: FormData) => Promise<UploadImageResult>;
  label?: string;
  accept?: string;
  disabled?: boolean;
}

/**
 * @deprecated Use UnifiedImageUpload with context="product" instead
 */
export function ImageUploadButton({
  onUploadSuccess,
  uploadFunction,
  label = "Téléverser une image",
  disabled = false,
}: ImageUploadButtonProps) {
  // Wrapper pour adapter l'ancien format au nouveau
  const adaptedUploadFunction = async (formData: FormData): Promise<ActionResult<UploadImageResult>> => {
    const result = await uploadFunction(formData);
    return {
      success: result.success,
      data: result,
      error: result.success ? undefined : result.message,
    };
  };

  return (
    <section role="form" aria-label="Upload d'image">
      <UnifiedImageUpload
        context="product"
        onUploadSuccess={onUploadSuccess}
        uploadFunction={adaptedUploadFunction}
        label={label}
        disabled={disabled}
      />
    </section>
  );
}