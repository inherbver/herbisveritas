"use client";
import { useState } from "react";
import { type PointRetrait } from "./ColissimoWidget";

interface ColissimoWidgetMockProps {
  token: string;
  defaultAddress?: {
    address?: string;
    zipCode?: string;
    city?: string;
  };
  onSelect: (point: PointRetrait) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Points de retrait fictifs pour la simulation
const mockPoints: PointRetrait[] = [
  {
    id: "POST_75008_001",
    name: "La Poste Champs-Élysées",
    address: "52 Avenue des Champs-Élysées",
    zipCode: "75008",
    city: "Paris",
    latitude: 48.870424,
    longitude: 2.307118,
    distance: 150,
    typeDePoint: "POST",
    horairesOuverture: "Lun-Ven 9h-19h, Sam 9h-17h",
  },
  {
    id: "RELAY_75008_002",
    name: "Relay Point Franklin Roosevelt",
    address: "25 Rue Jean Mermoz",
    zipCode: "75008",
    city: "Paris",
    latitude: 48.869123,
    longitude: 2.309456,
    distance: 280,
    typeDePoint: "PICKUP",
    horairesOuverture: "Lun-Sam 7h-22h, Dim 8h-20h",
  },
  {
    id: "PICKUP_75008_003",
    name: "Monoprix George V",
    address: "109 Avenue des Champs-Élysées",
    zipCode: "75008",
    city: "Paris",
    latitude: 48.872156,
    longitude: 2.300789,
    distance: 320,
    typeDePoint: "PICKUP",
    horairesOuverture: "Lun-Sam 9h-21h",
  },
  {
    id: "LOCKER_75009_004",
    name: "Consigne Pickup Station Opéra",
    address: "12 Boulevard des Capucines",
    zipCode: "75009",
    city: "Paris",
    latitude: 48.870987,
    longitude: 2.332156,
    distance: 850,
    typeDePoint: "LOCKER",
    horairesOuverture: "24h/24, 7j/7",
  },
];

export default function ColissimoWidgetMock({
  token,
  defaultAddress,
  onSelect,
  onError: _onError,
  className = "",
}: ColissimoWidgetMockProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const handlePointClick = (point: PointRetrait) => {
    setSelectedPointId(point.id);
    console.log("Point de retrait sélectionné (simulation):", point);
    onSelect(point);
  };

  const getPointTypeLabel = (type: string) => {
    switch (type) {
      case "POST":
        return "Bureau de Poste";
      case "PICKUP":
        return "Point Pickup";
      case "LOCKER":
        return "Consigne automatique";
      default:
        return "Point de retrait";
    }
  };

  const getPointTypeIcon = (type: string) => {
    switch (type) {
      case "POST":
        return "🏢";
      case "PICKUP":
        return "🏪";
      case "LOCKER":
        return "📦";
      default:
        return "📍";
    }
  };

  return (
    <section
      className={`rounded-lg border bg-white p-6 ${className}`}
      aria-label="Simulation widget Colissimo"
    >
      <header className="mb-4">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          🎭 Mode Simulation - Sélection Point de Retrait
        </h3>
        {defaultAddress && (
          <p className="text-sm text-gray-600">
            Points près de : {defaultAddress.address}, {defaultAddress.zipCode}{" "}
            {defaultAddress.city}
          </p>
        )}
        <details className="mt-1 text-xs text-blue-600">
          <summary className="cursor-pointer">Token utilisé</summary>
          <code className="mt-1 block rounded bg-blue-50 p-1 text-xs">{token}</code>
        </details>
      </header>

      <main className="space-y-3">
        {mockPoints.map((point) => (
          <article
            key={point.id}
            className={`cursor-pointer rounded-lg border p-4 transition-colors ${
              selectedPointId === point.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            onClick={() => handlePointClick(point)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePointClick(point);
              }
            }}
            aria-pressed={selectedPointId === point.id}
          >
            <header className="mb-2 flex items-start justify-between">
              <hgroup className="flex items-center space-x-2">
                <span className="text-lg" aria-hidden="true">
                  {getPointTypeIcon(point.typeDePoint || "")}
                </span>
                <section>
                  <h4 className="font-medium text-gray-900">{point.name}</h4>
                  <p className="text-xs text-gray-500">
                    {getPointTypeLabel(point.typeDePoint || "")}
                  </p>
                </section>
              </hgroup>
              <aside className="text-sm font-medium text-gray-600">
                {Math.round(point.distance)}m
              </aside>
            </header>

            <address className="mb-2 text-sm not-italic text-gray-700">
              {point.address}
              <br />
              {point.zipCode} {point.city}
            </address>

            {point.horairesOuverture && (
              <time className="block text-xs text-gray-600">📅 {point.horairesOuverture}</time>
            )}

            {selectedPointId === point.id && (
              <aside className="mt-3 border-t border-blue-200 pt-3">
                <p className="text-sm font-medium text-blue-700">✅ Point sélectionné</p>
              </aside>
            )}
          </article>
        ))}
      </main>

      <footer className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-500">
          Cette interface simule le widget Colissimo. En production, elle sera remplacée par le vrai
          widget connecté à l'API Colissimo.
        </p>
      </footer>
    </section>
  );
}
