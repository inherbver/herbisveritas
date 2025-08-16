// MIGRATED: Now uses UnifiedImageUpload with semantic HTML

"use client";

import { UnifiedImageUpload } from "@/components/common/image-upload";
import { uploadMagazineImageAction } from "@/actions/magazineActions";
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
}: ImageUploadProps) {
  const defaultTrigger = (
    <Button variant="outline" role="button" aria-label="Ouvrir le sélecteur d'image">
      <Upload className="mr-2 h-4 w-4" />
      Ajouter une image
    </Button>
  );

  return (
    <article role="main" aria-label="Interface d'upload d'image magazine">
      <UnifiedImageUpload
        context="magazine"
        onUploadSuccess={onImageSelect}
        uploadFunction={uploadMagazineImageAction}
        trigger={trigger || defaultTrigger}
        label="Ajouter une image"
      />
    </article>
  );
}

// Export des interfaces pour rétrocompatibilité
export interface UploadedImage {
  url: string;
  filename: string;
  size: number;
}

export interface UploadResult {
  success: boolean;
  message: string;
  data?: { url: string };
  errors?: { file?: string[]; fileName?: string[] };
}