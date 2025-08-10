import { Editor } from "@tiptap/react";
import { uploadMagazineImage } from "@/actions/magazineActions";
import { TipTapContent } from "@/types/magazine";

// Fonction utilitaire pour convertir un blob en base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface FileUploadHandlerOptions {
  onChange?: (content: TipTapContent) => void;
}

export function createFileUploadHandler(options: FileUploadHandlerOptions = {}) {
  return async (files: FileList, editorInstance?: Editor) => {
    const file = files[0];
    console.log("🔄 [TipTap] handleFileUpload appelé avec:", {
      fileName: file?.name,
      fileType: file?.type,
    });

    if (!file || !file.type.startsWith("image/")) {
      console.warn("⚠️ [TipTap] Fichier invalide ou pas une image");
      return;
    }

    const currentEditor = editorInstance;
    if (!currentEditor) {
      console.error("❌ [TipTap] Editor non disponible");
      return;
    }

    try {
      // Upload direct vers le serveur sans base64 temporaire
      console.log("☁️ [TipTap] Upload direct vers serveur");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name.split(".")[0]);

      const result = await uploadMagazineImage(formData);
      console.log("✅ [TipTap] Résultat upload serveur:", result);

      if (result.success && result.data?.url) {
        console.log("📝 [TipTap] Insertion image avec URL serveur:", result.data.url);

        // Insérer directement l'image avec l'URL du serveur
        currentEditor
          .chain()
          .focus()
          .setImage({
            src: result.data.url,
            alt: file.name.split(".")[0],
            title: file.name.split(".")[0],
          })
          .run();

        // Forcer la synchronisation avec un délai minimal
        setTimeout(() => {
          if (currentEditor && options.onChange) {
            const currentContent = currentEditor.getJSON();
            console.log(
              "💾 [TipTap] Contenu final après upload:",
              JSON.stringify(currentContent, null, 2)
            );
            options.onChange(currentContent);
          }
        }, 100);
      } else {
        console.error("❌ [TipTap] Échec upload serveur:", result);
        // En cas d'erreur, on peut optionnellement afficher l'image en base64
        const base64 = await blobToBase64(file);
        currentEditor
          .chain()
          .focus()
          .setImage({
            src: base64,
            alt: file.name.split(".")[0] + " (erreur upload)",
            title: "Image non sauvegardée - réessayez",
          })
          .run();
      }
    } catch (error) {
      console.error("💥 [TipTap] Erreur lors de l'upload d'image:", error);
      // En cas d'erreur, afficher en base64 avec indication d'erreur
      try {
        const base64 = await blobToBase64(file);
        currentEditor
          .chain()
          .focus()
          .setImage({
            src: base64,
            alt: file.name.split(".")[0] + " (erreur upload)",
            title: "Image non sauvegardée - réessayez",
          })
          .run();
      } catch {
        console.error("❌ [TipTap] Impossible de traiter l'image");
      }
    }
  };
}
