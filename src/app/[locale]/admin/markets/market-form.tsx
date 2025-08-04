"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createMarket, updateMarket } from "@/actions/marketActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Market } from "@/types/market";
import { ImageUploadButton } from "@/components/shared/image-upload-button";
import { uploadMarketImageCore } from "@/lib/storage/image-upload";

interface MarketFormProps {
  market?: Market;
  mode?: "create" | "edit";
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Dimanche" },
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
];

export function MarketForm({ market, mode = "create" }: MarketFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const heroImageRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        let result;
        
        if (mode === "edit" && market) {
          result = await updateMarket(market.id, formData);
        } else {
          result = await createMarket(formData);
        }

        if (result.success) {
          setSuccess(true);
          // Redirect after a brief delay to show success message
          setTimeout(() => {
            router.push("/admin/markets");
          }, 1500);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Une erreur inattendue s'est produite");
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Modifier le marché" : "Nouveau marché"}
        </CardTitle>
        <CardDescription>
          {mode === "edit" 
            ? "Modifiez les informations du marché" 
            : "Remplissez les informations du nouveau marché"
          }
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
              Marché {mode === "edit" ? "modifié" : "créé"} avec succès ! Redirection...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du marché */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du marché *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={market?.name}
              required
              placeholder="ex: Marché nocturne de Portiragnes"
            />
          </div>

          {/* Ville */}
          <div className="space-y-2">
            <Label htmlFor="city">Ville *</Label>
            <Input
              id="city"
              name="city"
              defaultValue={market?.city}
              required
              placeholder="ex: Portiragnes"
            />
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              name="address"
              defaultValue={market?.address}
              required
              placeholder="ex: Front de mer, 34420 Portiragnes"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={market?.start_date}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin *</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={market?.end_date}
                required
              />
            </div>
          </div>

          {/* Jour de la semaine */}
          <div className="space-y-2">
            <Label htmlFor="day_of_week">Jour de la semaine *</Label>
            <Select name="day_of_week" defaultValue={market?.day_of_week?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un jour" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Heure de début *</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={market?.start_time}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Heure de fin *</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={market?.end_time}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={market?.description || ""}
              placeholder="Description du marché (optionnel)"
              rows={3}
            />
          </div>

          {/* Lien GPS */}
          <div className="space-y-2">
            <Label htmlFor="gps_link">Lien GPS</Label>
            <Input
              id="gps_link"
              name="gps_link"
              type="url"
              defaultValue={market?.gps_link || ""}
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Images avec upload */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hero_image_url">Image principale</Label>
              <div className="flex gap-2">
                <Input
                  ref={heroImageRef}
                  id="hero_image_url"
                  name="hero_image_url"
                  type="url"
                  defaultValue={market?.hero_image_url || ""}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
                <ImageUploadButton
                  onUploadSuccess={(url) => {
                    if (heroImageRef.current) {
                      heroImageRef.current.value = url;
                    }
                  }}
                  uploadFunction={uploadMarketImageCore}
                  label="Upload"
                />
              </div>
              {market?.hero_image_url && (
                <img 
                  src={market.hero_image_url} 
                  alt="Image principale" 
                  className="h-24 w-auto rounded-md"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image secondaire</Label>
              <div className="flex gap-2">
                <Input
                  ref={imageRef}
                  id="image_url"
                  name="image_url"
                  type="url"
                  defaultValue={market?.image_url || ""}
                  placeholder="https://example.com/image2.jpg"
                  className="flex-1"
                />
                <ImageUploadButton
                  onUploadSuccess={(url) => {
                    if (imageRef.current) {
                      imageRef.current.value = url;
                    }
                  }}
                  uploadFunction={uploadMarketImageCore}
                  label="Upload"
                />
              </div>
              {market?.image_url && (
                <img 
                  src={market.image_url} 
                  alt="Image secondaire" 
                  className="h-24 w-auto rounded-md"
                />
              )}
            </div>
          </div>

          {/* Statut actif */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              name="is_active"
              defaultChecked={market?.is_active ?? true}
            />
            <Label htmlFor="is_active">Marché actif</Label>
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
              onClick={() => router.push("/admin/markets")}
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