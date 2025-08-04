"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UploadImageResult } from "@/lib/storage/image-upload";

interface ImageUploadButtonProps {
  onUploadSuccess: (url: string) => void;
  uploadFunction: (formData: FormData) => Promise<UploadImageResult>;
  label?: string;
  accept?: string;
  disabled?: boolean;
}

export function ImageUploadButton({
  onUploadSuccess,
  uploadFunction,
  label = "Téléverser une image",
  accept = "image/*",
  disabled = false,
}: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.split(".")[0]);

      const result = await uploadFunction(formData);

      if (result.success) {
        onUploadSuccess(result.data.url);
        toast.success(result.message);
        // Reset input to allow re-uploading the same file
        event.target.value = "";
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
    <div className="relative">
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isUploading}
        className="pointer-events-none"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Téléversement...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>
    </div>
  );
}