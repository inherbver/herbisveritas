"use client";
import { useState, useEffect } from "react";
import { MapPin, Clock, Phone, Search, Package } from "lucide-react";
import { getMockPickupPoints, simulateApiDelay, type PointRetrait } from "@/mocks/colissimo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DefaultAddress {
  address?: string;
  zipCode?: string;
  city?: string;
}

interface MockColissimoWidgetProps {
  defaultAddress?: DefaultAddress;
  onSelect: (point: PointRetrait) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function MockColissimoWidget({
  defaultAddress,
  onSelect,
  onError,
  className = "",
}: MockColissimoWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchZipCode, setSearchZipCode] = useState(defaultAddress?.zipCode || "");
  const [pickupPoints, setPickupPoints] = useState<PointRetrait[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Load initial pickup points if default address is provided
  useEffect(() => {
    if (defaultAddress?.zipCode) {
      loadPickupPoints(defaultAddress.zipCode);
    }
  }, [defaultAddress?.zipCode]);

  const loadPickupPoints = async (zipCode: string) => {
    if (!zipCode || zipCode.length < 5) {
      setError("Veuillez entrer un code postal valide (5 chiffres)");
      onError?.("Code postal invalide");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await simulateApiDelay();

      const points = getMockPickupPoints(zipCode);

      if (points.length === 0) {
        setError("Aucun point de retrait trouvé pour ce code postal");
        onError?.("Aucun point de retrait trouvé");
      } else {
        setPickupPoints(points);
        // Auto-select first point
        if (points.length > 0) {
          setSelectedPointId(points[0].id);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchZipCode && searchZipCode.length === 5) {
      loadPickupPoints(searchZipCode);
    }
  };

  const handleSelectPoint = () => {
    const selectedPoint = pickupPoints.find((p) => p.id === selectedPointId);
    if (selectedPoint) {
      onSelect(selectedPoint);
    }
  };

  const getPointTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("bureau")) {
      return <Package className="h-4 w-4" />;
    }
    return <MapPin className="h-4 w-4" />;
  };

  const getPointTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    if (type.toLowerCase().includes("bureau")) {
      return "default";
    }
    return "secondary";
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Sélectionner un point de retrait Colissimo
        </CardTitle>
        <CardDescription>
          {process.env.NODE_ENV === "development" && (
            <Badge variant="outline" className="mb-2">
              Mode Mock - Développement
            </Badge>
          )}
          Choisissez votre point de retrait préféré parmi les points disponibles
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Code postal (ex: 75001)"
            value={searchZipCode}
            onChange={(e) => setSearchZipCode(e.target.value)}
            maxLength={5}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !searchZipCode || searchZipCode.length !== 5}
            variant="default"
          >
            <Search className="mr-2 h-4 w-4" />
            Rechercher
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pickup points list */}
        {!isLoading && pickupPoints.length > 0 && (
          <>
            <RadioGroup value={selectedPointId} onValueChange={setSelectedPointId}>
              <div className="max-h-[400px] space-y-3 overflow-y-auto">
                {pickupPoints.map((point) => (
                  <Card
                    key={point.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPointId === point.id
                        ? "bg-primary/5 border-primary"
                        : "hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPointId(point.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={point.id} id={point.id} />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <Label htmlFor={point.id} className="cursor-pointer">
                              <div className="font-semibold">{point.name}</div>
                            </Label>
                            <Badge variant={getPointTypeBadgeVariant(point.typeDePoint)}>
                              <span className="flex items-center gap-1">
                                {getPointTypeIcon(point.typeDePoint)}
                                {point.typeDePoint}
                              </span>
                            </Badge>
                          </div>

                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{point.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="ml-5">
                                {point.zipCode} {point.city}
                              </span>
                            </div>

                            {point.horairesOuverture && (
                              <div className="mt-2 flex items-start gap-2">
                                <Clock className="mt-0.5 h-3 w-3" />
                                <span className="text-xs">{point.horairesOuverture}</span>
                              </div>
                            )}

                            {point.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span className="text-xs">{point.phone}</span>
                              </div>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {point.distance < 1000
                                  ? `${point.distance} m`
                                  : `${(point.distance / 1000).toFixed(1)} km`}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            {/* Confirm button */}
            <Button
              onClick={handleSelectPoint}
              disabled={!selectedPointId}
              className="w-full"
              size="lg"
            >
              Confirmer le point de retrait sélectionné
            </Button>
          </>
        )}

        {/* Empty state */}
        {!isLoading && !error && pickupPoints.length === 0 && searchZipCode && (
          <div className="py-8 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>Entrez un code postal pour rechercher les points de retrait disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
