import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useImageUpload } from "./useImageUpload";
import type { UploadImageResult } from "@/lib/storage/image-upload";
import type { ActionResult } from "@/lib/core/result";

interface DialogImageUploadProps {
  context: "magazine" | "product";
  onUploadSuccess: (url: string, altText?: string) => void;
  uploadFunction: (formData: FormData) => Promise<ActionResult<UploadImageResult>>;
  trigger?: React.ReactNode;
  label?: string;
  disabled?: boolean;
}

export function DialogImageUpload({
  context,
  onUploadSuccess,
  uploadFunction,
  trigger,
  label = "Téléverser une image",
  disabled = false,
}: DialogImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    config,
    isUploading,
    uploadProgress,
    error,
    uploadedImage,
    externalUrl,
    altText,
    fileInputRef,
    setExternalUrl,
    setAltText,
    handleDrop,
    handleFileSelect,
    resetUpload,
    handleUseImage: baseHandleUseImage,
  } = useImageUpload({
    context,
    uploadFunction,
    onUploadSuccess,
  });

  // Utilisation d'une image avec fermeture du dialog
  const handleUseImage = (url: string, altText?: string) => {
    baseHandleUseImage(url, altText);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" disabled={disabled} aria-label={label}>
            <Upload className="mr-2 h-4 w-4" />
            {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter une image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={config.showUrlInput ? "url" : "upload"} className="w-full">
          <TabsList className="grid w-full grid-cols-2" role="tablist">
            {config.showUrlInput && (
              <TabsTrigger value="url" role="tab" aria-controls="url-panel">
                URL externe
              </TabsTrigger>
            )}
            <TabsTrigger value="upload" role="tab" aria-controls="upload-panel">
              Téléverser
            </TabsTrigger>
          </TabsList>

          {config.showUrlInput && (
            <TabsContent value="url" className="space-y-4" role="tabpanel" id="url-panel">
              <fieldset>
                <legend className="sr-only">Utiliser une URL externe</legend>

                <div>
                  <Label htmlFor="external-url">URL de l'image</Label>
                  <Input
                    id="external-url"
                    type="url"
                    placeholder="https://exemple.com/image.jpg"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                  />
                </div>

                {config.showAltText && (
                  <div>
                    <Label htmlFor="alt-text">Texte alternatif (optionnel)</Label>
                    <Input
                      id="alt-text"
                      placeholder="Description de l'image"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  onClick={() => handleUseImage(externalUrl, altText)}
                  disabled={!externalUrl}
                  className="w-full"
                >
                  Utiliser cette image
                </Button>
              </fieldset>
            </TabsContent>
          )}

          <TabsContent value="upload" className="space-y-4" role="tabpanel" id="upload-panel">
            <fieldset>
              <legend className="sr-only">Télécharger un fichier</legend>

              {!uploadedImage ? (
                <section
                  className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  aria-label="Zone de glisser-déposer pour télécharger une image"
                >
                  <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden="true" />
                  <h3 className="mb-2 text-lg font-medium">Glissez-déposez votre image ici</h3>
                  <p className="mb-4 text-sm text-gray-500">ou cliquez pour sélectionner</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choisir un fichier
                  </Button>
                  <p className="mt-2 text-xs text-gray-400">
                    Formats acceptés: {config.allowedTypes.join(", ")} • Max {config.maxSizeInMB}MB
                  </p>
                </section>
              ) : (
                <section className="space-y-4">
                  <div
                    className="flex items-center gap-4 rounded-lg border bg-green-50 p-4"
                    role="status"
                  >
                    <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-medium">Image téléchargée avec succès</p>
                      <p className="text-sm text-gray-500">
                        {uploadedImage.filename} • {Math.round(uploadedImage.size / 1024)} KB
                      </p>
                    </div>
                  </div>

                  <figure>
                    <img
                      src={uploadedImage.url}
                      alt="Image téléchargée"
                      className="h-48 w-full rounded-lg border object-cover"
                    />
                  </figure>

                  {config.showAltText && (
                    <div>
                      <Label htmlFor="upload-alt-text">Texte alternatif (optionnel)</Label>
                      <Input
                        id="upload-alt-text"
                        placeholder="Description de l'image"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                      />
                    </div>
                  )}

                  <nav className="flex gap-2">
                    <Button
                      onClick={() => handleUseImage(uploadedImage.url, altText)}
                      className="flex-1"
                    >
                      Utiliser cette image
                    </Button>
                    <Button variant="outline" onClick={resetUpload}>
                      Changer
                    </Button>
                  </nav>
                </section>
              )}

              {isUploading && (
                <section className="space-y-2" role="status" aria-live="polite">
                  <div className="flex justify-between text-sm">
                    <span>Téléchargement en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress
                    value={uploadProgress}
                    aria-label={`Progression du téléchargement: ${uploadProgress}%`}
                  />
                </section>
              )}

              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={config.allowedTypes.join(",")}
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Sélectionner un fichier"
              />
            </fieldset>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
