"use client";

import { useState } from "react";
import { type PointRetrait } from "@/components/domain/colissimo/ColissimoWidget";
import ColissimoWidgetMock from "@/components/domain/colissimo/ColissimoWidgetMock";

export default function TestColissimoPage() {
  const [token, setToken] = useState<string>("");
  const [selectedPoint, setSelectedPoint] = useState<PointRetrait | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [error, setError] = useState<string>("");

  const generateToken = async () => {
    try {
      setIsLoadingToken(true);
      setError("");

      // Test : utilisation directe de la clé API comme token
      // En mode développement, nous utilisons une clé fictive pour tester l'UI
      const testToken = "test_token_for_ui_testing";
      setToken(testToken);

      console.log("Token de test généré pour l'interface");

      /* 
      // Code original pour l'Edge Function (à réactiver quand l'endpoint sera correct)
      const { data, error: functionError } = await supabase.functions.invoke('colissimo-token', {
        body: {}
      });
      
      if (functionError) {
        throw new Error(functionError.message);
      }
      
      if (!data.token) {
        throw new Error('Aucun token reçu de l\'API Colissimo');
      }
      
      setToken(data.token);
      console.log('Token généré:', data);
      */
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error("Erreur génération token:", err);
    } finally {
      setIsLoadingToken(false);
    }
  };

  const handlePointSelect = (point: PointRetrait) => {
    console.log("Point de retrait sélectionné:", point);
    setSelectedPoint(point);
  };

  const handleWidgetError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const testAddress = {
    address: "123 Avenue des Champs-Élysées",
    zipCode: "75008",
    city: "Paris",
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Test Widget Colissimo</h1>
        <p className="text-gray-600">
          Page de test pour l'intégration du widget de sélection des points de retrait Colissimo
        </p>
      </header>

      <section className="space-y-6">
        {/* Génération du token */}
        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold">1. Génération du token d'authentification</h2>

          <button
            onClick={generateToken}
            disabled={isLoadingToken}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingToken ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                <span>Génération...</span>
              </>
            ) : (
              <span>Générer un token Colissimo</span>
            )}
          </button>

          {token && (
            <aside className="mt-4 rounded border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                ✅ Token généré avec succès (valide 30 minutes)
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-green-700">Voir le token</summary>
                <code className="mt-1 block break-all text-xs text-green-600">{token}</code>
              </details>
            </aside>
          )}
        </section>

        {/* Affichage des erreurs */}
        {error && (
          <aside className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
            <h3 className="font-medium text-red-800">Erreur</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </aside>
        )}

        {/* Widget Colissimo */}
        {token && (
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">
              2. Widget de sélection des points de retrait
            </h2>

            <p className="mb-4 text-gray-600">
              Adresse de test : {testAddress.address}, {testAddress.zipCode} {testAddress.city}
            </p>

            {/* Mode simulation pour tester l'intégration */}
            <ColissimoWidgetMock
              token={token}
              defaultAddress={testAddress}
              onSelect={handlePointSelect}
              onError={handleWidgetError}
              className="mb-6"
            />

            {/* Widget réel (masqué en mode simulation) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600">
                Widget Colissimo réel (nécessite des credentials API valides)
              </summary>
              <aside className="mt-2 rounded border border-amber-200 bg-amber-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-amber-800">
                  ⚠️ Widget réel désactivé en mode test
                </h4>
                <p className="mb-3 text-sm text-amber-700">
                  Pour utiliser le vrai widget Colissimo, vous devez :
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-amber-700">
                  <li>Obtenir des credentials API valides auprès de Colissimo/La Poste</li>
                  <li>Configurer les variables d'environnement correctes</li>
                  <li>Adapter l'endpoint d'authentification selon votre type de compte</li>
                  <li>Remplacer le token de simulation par un vrai token JWT</li>
                </ol>
              </aside>
            </details>
          </section>
        )}

        {/* Résultat de la sélection */}
        {selectedPoint && (
          <section className="rounded-lg border border-green-200 bg-green-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-green-800">
              ✅ Point de retrait sélectionné
            </h2>

            <article className="space-y-2">
              <h3 className="font-medium text-green-900">{selectedPoint.name}</h3>
              <address className="text-sm not-italic text-green-800">
                {selectedPoint.address}
                <br />
                {selectedPoint.zipCode} {selectedPoint.city}
              </address>
              <p className="text-sm text-green-700">
                Distance : {Math.round(selectedPoint.distance)}m
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-green-700">
                  Voir toutes les données
                </summary>
                <pre className="mt-2 overflow-auto rounded border bg-white p-3 text-xs">
                  {JSON.stringify(selectedPoint, null, 2)}
                </pre>
              </details>
            </article>
          </section>
        )}

        {/* Instructions */}
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-3 text-xl font-semibold text-blue-800">Instructions de test</h2>
          <ol className="list-inside list-decimal space-y-2 text-blue-700">
            <li>
              Configurez vos credentials Colissimo dans les variables d'environnement Supabase
            </li>
            <li>Cliquez sur "Générer un token Colissimo"</li>
            <li>Le widget devrait s'afficher avec une carte des points de retrait</li>
            <li>Sélectionnez un point de retrait</li>
            <li>Les données du point sélectionné s'afficheront ci-dessus</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
