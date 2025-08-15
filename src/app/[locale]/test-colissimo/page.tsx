"use client";
import { useState } from "react";
import ColissimoWidgetWrapper from "@/components/domain/colissimo/ColissimoWidgetWrapper";
import type { PointRetrait } from "@/mocks/colissimo-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Phone, Clock } from "lucide-react";

export default function TestColissimoPage() {
  const [selectedPoint, setSelectedPoint] = useState<PointRetrait | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePointSelect = (point: PointRetrait) => {
    console.log("Point sélectionné:", point);
    setSelectedPoint(point);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    console.error("Erreur widget:", errorMessage);
    setError(errorMessage);
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Test du Widget Colissimo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Widget */}
        <div>
          <ColissimoWidgetWrapper
            defaultAddress={{
              zipCode: "75001",
              city: "Paris",
              address: "10 rue de Rivoli"
            }}
            onSelect={handlePointSelect}
            onError={handleError}
            forceMode="mock" // Force le mode mock pour les tests
          />
        </div>

        {/* Résultat */}
        <div className="space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Erreur</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {selectedPoint && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Point de retrait sélectionné
                </CardTitle>
                <CardDescription>
                  Les détails du point de retrait choisi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPoint.name}</h3>
                  {selectedPoint.company && (
                    <p className="text-sm text-muted-foreground">{selectedPoint.company}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p>{selectedPoint.address_1 || selectedPoint.address}</p>
                      {selectedPoint.address_2 && <p>{selectedPoint.address_2}</p>}
                      <p>{selectedPoint.zipCode} {selectedPoint.city}</p>
                    </div>
                  </div>

                  {selectedPoint.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedPoint.phone}</span>
                    </div>
                  )}

                  {selectedPoint.horairesOuverture && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span className="text-sm">{selectedPoint.horairesOuverture}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedPoint.service_code && (
                    <Badge variant="outline">Code: {selectedPoint.service_code}</Badge>
                  )}
                  {selectedPoint.pickup_id && (
                    <Badge variant="outline">ID: {selectedPoint.pickup_id}</Badge>
                  )}
                  {selectedPoint.typeDePoint && (
                    <Badge>{selectedPoint.typeDePoint}</Badge>
                  )}
                </div>

                {/* Données JSON complètes pour debug */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Voir les données complètes (debug)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedPoint, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}

          {!selectedPoint && !error && (
            <Card>
              <CardHeader>
                <CardTitle>En attente de sélection</CardTitle>
                <CardDescription>
                  Sélectionnez un point de retrait dans le widget à gauche
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}