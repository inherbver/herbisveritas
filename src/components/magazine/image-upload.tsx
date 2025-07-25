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
import { AlertCircle, Upload, Link, X, CheckCircle } from "lucide-react";
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
  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Type de fichier non supporté. Types autorisés: ${allowedTypes.join(", ")}`;
    }
    
    const maxSize = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `Le fichier est trop volumineux. Taille maximum: ${maxSizeInMB}MB`;
    }
    
    return null;
  };

  // Upload via Server Action
  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Simulation du progrès
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      // Utilisation de l'action existante
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.split(".")[0]); // Nom sans extension
      
      const result = await uploadMagazineImage(formData) as UploadResult;

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

      const uploadedImage: UploadedImage = {
        url: result.data.url,
        filename: file.name,
        size: file.size,
      };

      setUploadedImage(uploadedImage);
      return uploadedImage;
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'upload");
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Gestion du changement de fichier
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    [uploadFile]
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
      onImageSelect(imageUrl, altText);
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
            <Upload className="h-4 w-4 mr-2" />
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
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                "hover:border-gray-400 hover:bg-gray-50",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              {!isUploading && !uploadedImage && (
                <>
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Glissez une image ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-gray-500">
                    Types supportés: JPEG, PNG, GIF, WebP (max {maxSizeInMB}MB)
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choisir un fichier
                  </Button>
                </>
              )}

              {isUploading && (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Upload en cours...</p>
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                  </div>
                </div>
              )}

              {uploadedImage && (
                <div className="space-y-4">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Upload terminé !</p>
                    <p className="text-xs text-gray-500">{uploadedImage.filename}</p>
                    <p className="text-xs text-gray-500">
                      {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <img
                    src={uploadedImage.url}
                    alt="Preview"
                    className="max-w-full max-h-32 mx-auto rounded border"
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
                className={cn(
                  externalUrl && !isValidUrl(externalUrl) && "border-red-500"
                )}
              />
              {externalUrl && !isValidUrl(externalUrl) && (
                <p className="text-sm text-red-600">URL d'image invalide</p>
              )}
            </div>

            {externalUrl && isValidUrl(externalUrl) && (
              <div className="border rounded p-4">
                <p className="text-sm text-gray-600 mb-2">Aperçu :</p>
                <img
                  src={externalUrl}
                  alt="Preview"
                  className="max-w-full max-h-32 mx-auto rounded border"
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
            disabled={
              isUploading ||
              (!uploadedImage && (!externalUrl || !isValidUrl(externalUrl)))
            }
          >
            Insérer l'image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}