"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Upload, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadMagazineImage } from "@/actions/magazineActions";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (imageUrl: string, altText?: string) => void;
  trigger?: React.ReactNode;
  maxSizeInMB?: number;
  allowedTypes?: string[];
}

interface UploadedImage {
  url: string;
  filename: string;
  size: number;
}

interface UploadResult {
  success: boolean;
  message: string;
  data?: { url: string };
  errors?: { file?: string[]; fileName?: string[] };
}

export function ImageUpload({
  onImageSelect,
  trigger,
  maxSizeInMB = 5,
  allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
}: ImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);

  // Formulaire pour URL externe
  const [externalUrl, setExternalUrl] = useState("");
  const [altText, setAltText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation du fichier
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return `Type de fichier non supporté. Types autorisés: ${allowedTypes.join(", ")}`;
      }

      const maxSize = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSize) {
        return `Le fichier est trop volumineux. Taille maximum: ${maxSizeInMB}MB`;
      }

      return null;
    },
    [allowedTypes, maxSizeInMB]
  );

  // Upload via Server Action
  const uploadFile = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        // Simulation du progrès
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 20, 90));
        }, 200);

        // Utilisation de l'action existante
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name.split(".")[0]); // Nom sans extension

        const result = (await uploadMagazineImage(formData)) as UploadResult;

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!result.success) {
          console.error("Upload failed:", result);

          // Afficher les erreurs de validation détaillées si disponibles
          if (result.errors) {
            const errorMessages = [];
            if (result.errors.file) errorMessages.push(...result.errors.file);
            if (result.errors.fileName) errorMessages.push(...result.errors.fileName);
            if (errorMessages.length > 0) {
              throw new Error(errorMessages.join(". "));
            }
          }

          throw new Error(result.message || "Erreur lors de l'upload");
        }

        if (!result.data?.url) {
          throw new Error("Upload failed - no URL returned");
        }

        const uploadedImage: UploadedImage = {
          url: result.data.url,
          filename: file.name,
          size: file.size,
        };

        setUploadedImage(uploadedImage);

        // Insérer automatiquement l'image après l'upload réussi
        setTimeout(() => {
          console.log("🔧 [ImageUpload] Auto-insertion après upload:", {
            url: uploadedImage.url,
            filename: uploadedImage.filename,
          });
          // Utiliser le nom de fichier comme alt text par défaut
          const altText = file.name.split(".")[0];
          console.log("🔧 [ImageUpload] Appel onImageSelect avec alt text:", altText);
          onImageSelect(uploadedImage.url, altText);
          handleClose(false); // Fermer la modal
        }, 500); // Petit délai pour permettre à l'utilisateur de voir le succès

        return uploadedImage;
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Erreur lors de l'upload");
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [onImageSelect]
  );

  // Gestion du changement de fichier
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📁 [ImageUpload] handleFileChange déclenché");
    const file = event.target.files?.[0];

    if (!file) {
      console.log("⚠️ [ImageUpload] Aucun fichier sélectionné");
      return;
    }

    console.log("📄 [ImageUpload] Fichier sélectionné:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Reset l'input pour permettre de sélectionner le même fichier à nouveau
    event.target.value = "";

    const validationError = validateFile(file);
    if (validationError) {
      console.error("❌ [ImageUpload] Erreur de validation:", validationError);
      setError(validationError);
      return;
    }

    console.log("✅ [ImageUpload] Fichier validé, début upload");
    try {
      await uploadFile(file);
      console.log("🎉 [ImageUpload] Upload terminé avec succès");
    } catch (error) {
      console.error("💥 [ImageUpload] Erreur d'upload:", error);
    }
  };

  // Gestion du drag & drop
  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];

      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        await uploadFile(file);
      } catch (error) {
        console.error("Erreur d'upload:", error);
      }
    },
    [uploadFile, validateFile]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Validation d'URL externe
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    } catch {
      return false;
    }
  };

  // Insertion de l'image
  const handleInsertImage = () => {
    let imageUrl = "";

    if (uploadedImage) {
      imageUrl = uploadedImage.url;
    } else if (externalUrl && isValidUrl(externalUrl)) {
      imageUrl = externalUrl;
    }

    if (imageUrl) {
      console.log("🔧 [ImageUpload] Insertion manuelle avec:", {
        url: imageUrl,
        altText: altText || "Image",
      });
      onImageSelect(imageUrl, altText || "Image");
      // Reset
      handleClose(false);
    }
  };

  // Reset lors de la fermeture
  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setUploadedImage(null);
      setExternalUrl("");
      setAltText("");
      setError(null);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Ajouter une image
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">URL externe</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* Zone de drop */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={(e) => {
                // Seulement déclencher si le clic n'est pas sur le bouton
                if (e.target === e.currentTarget && !isUploading && !uploadedImage) {
                  console.log("🖱️ [ImageUpload] Clic sur la zone de drop");
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                "hover:border-gray-400 hover:bg-gray-50",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              {!isUploading && !uploadedImage && (
                <>
                  <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-600">
                    Glissez une image ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-gray-500">
                    Types supportés: JPEG, PNG, GIF, WebP (max {maxSizeInMB}MB)
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖱️ [ImageUpload] Bouton "Choisir un fichier" cliqué');
                      console.log("📂 [ImageUpload] fileInputRef.current:", fileInputRef.current);

                      // Essayer plusieurs approches pour ouvrir le file chooser
                      if (fileInputRef.current) {
                        try {
                          // Approche 1: click direct
                          fileInputRef.current.click();
                          console.log("✅ [ImageUpload] fileInputRef.current.click() appelé");
                        } catch (error) {
                          console.error("❌ [ImageUpload] Erreur avec click():", error);
                          // Approche 2: dispatch event
                          try {
                            const event = new MouseEvent("click", {
                              view: window,
                              bubbles: true,
                              cancelable: true,
                            });
                            fileInputRef.current.dispatchEvent(event);
                            console.log("✅ [ImageUpload] dispatchEvent utilisé");
                          } catch (dispatchError) {
                            console.error(
                              "❌ [ImageUpload] Erreur avec dispatchEvent:",
                              dispatchError
                            );
                          }
                        }
                      } else {
                        console.error("❌ [ImageUpload] fileInputRef.current est null");
                        // Approche 3: chercher l'input dans le DOM
                        const input = document.querySelector(
                          'input[type="file"]'
                        ) as HTMLInputElement;
                        if (input) {
                          input.click();
                          console.log("✅ [ImageUpload] input trouvé via querySelector et cliqué");
                        } else {
                          console.error("❌ [ImageUpload] Aucun input file trouvé");
                        }
                      }
                    }}
                    disabled={isUploading}
                    type="button"
                  >
                    Choisir un fichier
                  </Button>
                </>
              )}

              {isUploading && (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 animate-pulse text-blue-500" />
                  <div>
                    <p className="mb-2 text-sm text-gray-600">Upload en cours...</p>
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="mt-1 text-xs text-gray-500">{uploadProgress}%</p>
                  </div>
                </div>
              )}

              {uploadedImage && (
                <div className="space-y-4">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Upload terminé !</p>
                    <p className="text-xs text-gray-500">{uploadedImage.filename}</p>
                    <p className="text-xs text-gray-500">
                      {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <img
                    src={uploadedImage.url}
                    alt="Preview"
                    className="mx-auto max-h-32 max-w-full rounded border"
                  />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="external-url">URL de l'image</Label>
              <Input
                id="external-url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={cn(externalUrl && !isValidUrl(externalUrl) && "border-red-500")}
              />
              {externalUrl && !isValidUrl(externalUrl) && (
                <p className="text-sm text-red-600">URL d'image invalide</p>
              )}
            </div>

            {externalUrl && isValidUrl(externalUrl) && (
              <div className="rounded border p-4">
                <p className="mb-2 text-sm text-gray-600">Aperçu :</p>
                <img
                  src={externalUrl}
                  alt="Preview"
                  className="mx-auto max-h-32 max-w-full rounded border"
                  onError={() => setError("Impossible de charger l'image")}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Texte alternatif */}
        <div className="space-y-2">
          <Label htmlFor="alt-text">Texte alternatif (recommandé)</Label>
          <Textarea
            id="alt-text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Description de l'image pour l'accessibilité"
            rows={2}
          />
        </div>

        {/* Erreurs */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleInsertImage}
            disabled={isUploading || (!uploadedImage && (!externalUrl || !isValidUrl(externalUrl)))}
          >
            Insérer l'image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
