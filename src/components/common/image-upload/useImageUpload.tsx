import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { UploadImageResult } from "@/lib/storage/image-upload";
import type { ActionResult } from "@/lib/core/result";

// Types unifiés
interface UnifiedUploadResult {
  success: boolean;
  message: string;
  data?: UploadImageResult;
  error?: string;
  errors?: Record<string, string[]>;
}

interface UploadedImage {
  url: string;
  filename: string;
  size: number;
}

// Configuration par contexte
interface ContextConfig {
  maxSizeInMB: number;
  allowedTypes: string[];
  dialogMode: boolean;
  showUrlInput: boolean;
  showAltText: boolean;
}

const CONTEXT_CONFIGS: Record<string, ContextConfig> = {
  magazine: {
    maxSizeInMB: 5,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    dialogMode: true,
    showUrlInput: true,
    showAltText: true,
  },
  product: {
    maxSizeInMB: 4,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    dialogMode: true,
    showUrlInput: true,
    showAltText: false,
  },
  avatar: {
    maxSizeInMB: 2,
    allowedTypes: ["image/jpeg", "image/png"],
    dialogMode: false,
    showUrlInput: false,
    showAltText: false,
  },
};

interface UseImageUploadProps {
  context: keyof typeof CONTEXT_CONFIGS;
  uploadFunction: (
    formData: FormData
  ) => Promise<ActionResult<UploadImageResult> | UnifiedUploadResult>;
  onUploadSuccess: (url: string, altText?: string) => void;
  currentValue?: string;
}

export function useImageUpload({
  context,
  uploadFunction,
  onUploadSuccess,
  currentValue = "",
}: UseImageUploadProps) {
  const config = CONTEXT_CONFIGS[context];

  // États
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [externalUrl, setExternalUrl] = useState(currentValue);
  const [altText, setAltText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation du fichier
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!config.allowedTypes.includes(file.type)) {
        return `Type de fichier non supporté. Types autorisés: ${config.allowedTypes.join(", ")}`;
      }

      const maxSize = config.maxSizeInMB * 1024 * 1024;
      if (file.size > maxSize) {
        return `Le fichier est trop volumineux. Taille maximum: ${config.maxSizeInMB}MB`;
      }

      return null;
    },
    [config.allowedTypes, config.maxSizeInMB]
  );

  // Normalisation du résultat upload
  const normalizeUploadResult = (result: unknown): UnifiedUploadResult => {
    // Handle ActionResult<UploadImageResult>
    const actionResult = result as ActionResult<UploadImageResult>;
    if (actionResult?.success && actionResult.data) {
      let url: string;
      let message: string;

      if (typeof actionResult.data === "object") {
        if ("data" in actionResult.data && "url" in actionResult.data.data) {
          // Format: ActionResult<UploadImageResult> avec data nested
          url = actionResult.data.data.url;
          message =
            actionResult.data.message || actionResult.message || "Image téléchargée avec succès";
        } else if ("url" in actionResult.data) {
          // Format: ActionResult avec UploadImageResult direct
          url = actionResult.data.url;
          message = actionResult.message || "Image téléchargée avec succès";
        } else {
          throw new Error("Format de réponse inattendu");
        }
      } else {
        throw new Error("Format de réponse invalide");
      }

      return {
        success: true,
        message,
        data: { url, success: true, message },
      };
    }

    return {
      success: false,
      message: actionResult?.error || actionResult?.message || "Erreur lors du téléchargement",
      error: actionResult?.error || actionResult?.message,
    };
  };

  // Upload du fichier
  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        // Simulation du progrès pour UX
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 20, 90));
        }, 200);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name.split(".")[0]);

        const rawResult = await uploadFunction(formData);
        const result = normalizeUploadResult(rawResult);

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (result.success && result.data) {
          setUploadedImage({
            url: result.data.url,
            filename: file.name,
            size: file.size,
          });
          toast.success(result.message);
        } else {
          const errorMsg = result.error || "Erreur lors du téléchargement";
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error("Upload error:", error);
        const errorMsg = "Erreur lors du téléversement de l'image";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFunction, validateFile]
  );

  // Gestion du drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [uploadFile]
  );

  // Sélection manuelle via input
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  // Réinitialisation
  const resetUpload = () => {
    setUploadedImage(null);
    setError(null);
    setUploadProgress(0);
    setExternalUrl("");
    setAltText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Utilisation d'une image
  const handleUseImage = (url: string, altText?: string) => {
    onUploadSuccess(url, altText);
    resetUpload();
  };

  return {
    // Configuration
    config,

    // États
    isUploading,
    uploadProgress,
    error,
    uploadedImage,
    externalUrl,
    altText,

    // Refs
    fileInputRef,

    // Setters
    setExternalUrl,
    setAltText,

    // Actions
    uploadFile,
    handleDrop,
    handleFileSelect,
    resetUpload,
    handleUseImage,
  };
}
