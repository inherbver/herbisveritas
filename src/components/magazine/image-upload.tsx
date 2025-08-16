// MIGRATED: Now uses UnifiedImageUpload with semantic HTML

"use client";

import { UnifiedImageUpload } from "@/components/common/image-upload";
import { uploadMagazineImage } from "@/actions/magazineActions";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (imageUrl: string, altText?: string) => void;
  trigger?: React.ReactNode;
  maxSizeInMB?: number;
  allowedTypes?: string[];
}

/**
 * Magazine-specific image upload component with dialog interface
 * Uses semantic HTML with proper ARIA roles and labels
 */
export function ImageUpload({
  onImageSelect,
  trigger,
  maxSizeInMB = 4,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
}: ImageUploadProps) {
  const defaultTrigger = (
    <Button variant="outline" type="button" className="flex items-center gap-2">
      <Upload className="h-4 w-4" />
      Ajouter une image
    </Button>
  );

  return (
    <section aria-label="Upload d'image pour magazine">
      <UnifiedImageUpload
        context="magazine"
        onUploadSuccess={onImageSelect}
        uploadFunction={uploadMagazineImage}
        trigger={trigger || defaultTrigger}
        maxSizeInMB={maxSizeInMB}
        allowedTypes={allowedTypes}
      />
    </section>
  );
}