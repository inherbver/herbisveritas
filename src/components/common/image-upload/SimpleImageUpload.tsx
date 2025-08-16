import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Link2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageUpload } from "./useImageUpload";
import type { UploadImageResult } from "@/lib/storage/image-upload";
import type { ActionResult } from "@/lib/core/result";

interface SimpleImageUploadProps {
  context: "product" | "avatar";
  onUploadSuccess: (url: string, altText?: string) => void;
  uploadFunction: (formData: FormData) => Promise<ActionResult<UploadImageResult>>;
  label?: string;
  currentValue?: string;
  disabled?: boolean;
  className?: string;
}

export function SimpleImageUpload({
  context,
  onUploadSuccess,
  uploadFunction,
  label = "Téléverser une image",
  currentValue = "",
  disabled = false,
  className,
}: SimpleImageUploadProps) {
  const {
    config,
    isUploading,
    externalUrl,
    setExternalUrl,
    fileInputRef,
    handleFileSelect,
    handleUseImage,
  } = useImageUpload({
    context,
    uploadFunction,
    onUploadSuccess,
    currentValue,
  });

  return (
    <section className={cn("flex flex-col gap-2", className)} aria-label="Upload d'image">
      {currentValue && (
        <div className="flex items-center gap-2">
          <img src={currentValue} alt="Image actuelle" className="h-10 w-10 rounded object-cover" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUploadSuccess("")}
            disabled={disabled}
            aria-label="Supprimer l'image actuelle"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={config.allowedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
        aria-label="Sélectionner un fichier"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="w-full"
        aria-label={label}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Téléchargement...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>

      {config.showUrlInput && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://exemple.com/image.jpg"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            disabled={disabled}
            aria-label="URL de l'image externe"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => handleUseImage(externalUrl)}
            disabled={!externalUrl || disabled}
            aria-label="Utiliser l'URL externe"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
