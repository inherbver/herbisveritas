"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPartner, updatePartner } from "@/actions/partnerActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Partner } from "@/types/partner";
import { ImageUploadButton } from "@/components/common/image-upload-button";
import { uploadPartnerImageCore } from "@/lib/storage/image-upload";

interface PartnerFormProps {
  partner?: Partner;
  mode?: "create" | "edit";
}

export function PartnerForm({ partner, mode = "create" }: PartnerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const imageUrlRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        let result;

        if (mode === "edit" && partner) {
          result = await updatePartner(partner.id, formData);
        } else {
          result = await createPartner(formData);
        }

        if (result.success) {
          setSuccess(true);
          // Redirect after a brief delay to show success message
          setTimeout(() => {
            router.push("/admin/partners");
          }, 1500);
        } else {
          setError(result.error || null);
        }
      } catch (err) {
        setError("Une erreur inattendue s'est produite");
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "edit" ? "Modifier le partenaire" : "Nouveau partenaire"}</CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Modifiez les informations du partenaire"
            : "Remplissez les informations du nouveau partenaire"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Partenaire {mode === "edit" ? "modifié" : "créé"} avec succès ! Redirection...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du partenaire */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du partenaire *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={partner?.name}
              required
              placeholder="ex: La Touche essentielle"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={partner?.description}
              required
              placeholder="Description des services ou produits du partenaire"
              rows={4}
            />
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              name="address"
              defaultValue={partner?.address}
              required
              placeholder="ex: 24 rue Anatole France, 34120 Pézenas"
            />
          </div>

          {/* URL de l'image avec upload */}
          <div className="space-y-2">
            <Label htmlFor="image_url">URL de l'image *</Label>
            <div className="flex gap-2">
              <Input
                ref={imageUrlRef}
                id="image_url"
                name="image_url"
                type="url"
                defaultValue={partner?.image_url}
                required
                placeholder="https://example.com/image.jpg"
                className="flex-1"
              />
              <ImageUploadButton
                onUploadSuccess={(url) => {
                  if (imageUrlRef.current) {
                    imageUrlRef.current.value = url;
                  }
                }}
                uploadFunction={uploadPartnerImageCore}
                label="Upload"
              />
            </div>
            {partner?.image_url && (
              <img
                src={partner.image_url}
                alt="Logo partenaire"
                className="h-24 w-auto rounded-md"
              />
            )}
          </div>

          {/* URL Facebook */}
          <div className="space-y-2">
            <Label htmlFor="facebook_url">URL Facebook</Label>
            <Input
              id="facebook_url"
              name="facebook_url"
              type="url"
              defaultValue={partner?.facebook_url || ""}
              placeholder="https://facebook.com/..."
            />
          </div>

          {/* Ordre d'affichage */}
          <div className="space-y-2">
            <Label htmlFor="display_order">Ordre d'affichage</Label>
            <Input
              id="display_order"
              name="display_order"
              type="number"
              min="0"
              defaultValue={partner?.display_order ?? 0}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Plus le nombre est petit, plus le partenaire apparaîtra en haut de la liste
            </p>
          </div>

          {/* Statut actif */}
          <div className="flex items-center space-x-2">
            <Switch id="is_active" name="is_active" defaultChecked={partner?.is_active ?? true} />
            <Label htmlFor="is_active">Partenaire actif</Label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Mettre à jour" : "Créer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/partners")}
              disabled={isPending}
            >
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
