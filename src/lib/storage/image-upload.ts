"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkUserPermission } from "@/lib/auth/server-auth";
import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import type { AppPermission } from "@/lib/auth/types";
import { z } from "zod";
import { slugify } from "@/utils/slugify";

// Schéma de validation unifié
const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Le fichier ne peut pas être vide.")
    .refine(
      (file) => file.size < 4 * 1024 * 1024, // 4MB max
      "Le fichier ne doit pas dépasser 4Mo."
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
      "Le format du fichier doit être JPEG, PNG, WEBP ou GIF."
    ),
  fileName: z.string().min(3, "Le nom du fichier doit contenir au moins 3 caractères."),
});

// Type de retour unifié
export type UploadImageResult =
  | { success: true; data: { url: string }; message: string }
  | { success: false; message: string; errors?: { file?: string[]; fileName?: string[] } };

// Configuration par bucket
interface BucketConfig {
  bucket: "products" | "magazine" | "contact";
  permission: AppPermission;
  usePermissionSafe?: boolean;
}

// Fonction core d'upload
async function uploadImageCore(
  formData: FormData,
  config: BucketConfig
): Promise<UploadImageResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification permission (si pas déjà dans wrapper)
    if (!config.usePermissionSafe) {
      const permissionResult = await checkUserPermission(config.permission);
      if (!permissionResult.isAuthorized) {
        return {
          success: false,
          message: "Permission refusée pour l'upload d'images.",
        };
      }
    }

    // Extraction et validation
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;
    const validationResult = imageUploadSchema.safeParse({ file, fileName });

    if (!validationResult.success) {
      return {
        success: false,
        message: "Validation échouée",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { file: validatedFile, fileName: validatedFileName } = validationResult.data;

    // Génération du chemin
    const fileExtension = validatedFile.name.split(".").pop();
    const sanitizedFileName = slugify(validatedFileName);
    const filePath = `${sanitizedFileName}.${fileExtension}`;

    // Upload Supabase
    const { error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, validatedFile, { upsert: true });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return {
        success: false,
        message: `Erreur lors de l'upload: ${uploadError.message}`,
      };
    }

    // URL publique
    const { data: publicUrlData } = supabase.storage.from(config.bucket).getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      return {
        success: false,
        message: "Impossible de récupérer l'URL publique après l'upload.",
      };
    }

    return {
      success: true,
      message: "Image téléversée avec succès !",
      data: { url: publicUrlData.publicUrl },
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de l'upload",
    };
  }
}

// Exports publics - wrappers spécialisés
export const uploadProductImageCore = withPermissionSafe(
  "products:update",
  async (formData: FormData): Promise<UploadImageResult> =>
    uploadImageCore(formData, {
      bucket: "products",
      permission: "products:update",
      usePermissionSafe: true,
    })
);

export async function uploadMagazineImageCore(formData: FormData): Promise<UploadImageResult> {
  return uploadImageCore(formData, {
    bucket: "magazine",
    permission: "content:create",
  });
}

// Market image upload
export async function uploadMarketImageCore(formData: FormData): Promise<UploadImageResult> {
  return uploadImageCore(formData, {
    bucket: "contact",
    permission: "content:create",
  });
}

// Partner image upload
export async function uploadPartnerImageCore(formData: FormData): Promise<UploadImageResult> {
  return uploadImageCore(formData, {
    bucket: "contact",
    permission: "content:create",
  });
}
