"use client";
import { useEffect, useRef, useState } from "react";
import $ from "jquery";
import "mapbox-gl/dist/mapbox-gl.css";

// Déclaration globale pour jQuery Colissimo plugin
declare global {
  interface Window {
    handleColissimoSelect?: (point: PointRetrait) => void;
    jQuery?: JQueryStatic;
    $?: JQueryStatic;
    [callbackId: string]: unknown; // Pour les callbacks dynamiques
  }
  interface JQuery {
    frameColissimoOpen(options: ColissimoWidgetOptions): void;
    frameColissimoClose(): void;
  }
}

// Interface pour jQuery avec plugin Colissimo
interface JQueryWithColissimo extends JQueryStatic {
  fn: JQueryStatic['fn'] & {
    frameColissimoOpen?: (options: ColissimoWidgetOptions) => void;
    frameColissimoClose?: () => void;
  };
}

export interface PointRetrait {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  latitude: number;
  longitude: number;
  distance: number; // en mètres
  typeDePoint?: string;
  horairesOuverture?: string;
}

interface ColissimoWidgetOptions {
  URLColissimo: string;
  callBackFrame: string;
  ceCountry: string;
  ceAddress?: string;
  ceZipCode?: string;
  ceTown?: string;
  origin: string;
  filterRelay: string;
  token: string;
  dyPreparationTime?: number;
}

interface DefaultAddress {
  address?: string;
  zipCode?: string;
  city?: string;
}

interface ColissimoWidgetProps {
  token: string;
  defaultAddress?: DefaultAddress;
  onSelect: (point: PointRetrait) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Utilitaire pour charger dynamiquement le script jQuery Colissimo
const loadColissimoScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Vérifier si le script est déjà chargé et si le plugin est disponible
    const existingScript = document.querySelector(`script[src="${src}"]`);
     
    if (existingScript && ($ as JQueryWithColissimo).fn.frameColissimoOpen) {
      console.log("Script Colissimo déjà chargé et plugin disponible");
      resolve();
      return;
    }

    // Supprimer tous les scripts Colissimo existants pour éviter les conflits
    document.querySelectorAll('script[src*="colissimo"]').forEach((script) => script.remove());

    // S'assurer que jQuery est disponible globalement
     
    if (typeof window.jQuery === "undefined") {
      console.log("jQuery non disponible globalement, exposition...");
       
      window.jQuery = $;
      window.$ = $;
    }

    console.log("Chargement du script Colissimo...");
    const script = document.createElement("script");
    script.src = src;
    script.async = false; // Chargement synchrone pour garantir l'ordre
    script.type = "text/javascript";

    script.onload = () => {
      console.log("Script Colissimo chargé");

      // Vérifier que le plugin jQuery est bien disponible
      const checkPlugin = () => {
        const jQueryAvailable =
          typeof $ !== "undefined" && typeof window.jQuery !== "undefined";
        const pluginAvailable = jQueryAvailable && ($ as JQueryWithColissimo).fn.frameColissimoOpen;

        console.log(`jQuery disponible: ${jQueryAvailable}, Plugin disponible: ${pluginAvailable}`);

        if (pluginAvailable) {
          console.log("Plugin jQuery Colissimo disponible");
          resolve();
        } else if (Date.now() - startTime > 5000) {
          // Timeout après 5 secondes
          reject(new Error("Timeout: Plugin jQuery Colissimo non disponible après 5 secondes"));
        } else {
          console.log("Plugin jQuery Colissimo non disponible, nouvelle tentative...");
          setTimeout(checkPlugin, 100);
        }
      };

      const startTime = Date.now();
      // Attendre un peu que le plugin s'initialise
      setTimeout(checkPlugin, 100);
    };

    script.onerror = () => {
      console.error("Erreur lors du chargement du script Colissimo");
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
};

export default function ColissimoWidget({
  token,
  defaultAddress,
  onSelect,
  onError,
  className = "",
}: ColissimoWidgetProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackId = useRef(`handleColissimoSelect_${Date.now()}`);

  useEffect(() => {
    if (!token || !containerRef.current) {
      return;
    }

    const initializeWidget = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Charger le script jQuery Colissimo
        await loadColissimoScript(
          "https://ws.colissimo.fr/widget-colissimo/js/jquery.plugin.colissimo.min.js"
        );

        // Vérification finale que le plugin est bien disponible
         
        if (!$ || !($ as JQueryWithColissimo).fn.frameColissimoOpen) {
          throw new Error("Le plugin jQuery Colissimo n'est pas disponible après chargement");
        }

        const container = $(containerRef.current!);

        // Vérifier que le conteneur jQuery est valide
        if (!container.length) {
          throw new Error("Conteneur DOM non trouvé pour le widget Colissimo");
        }

        // Configuration du widget
        const widgetOptions: ColissimoWidgetOptions = {
          URLColissimo: "https://ws.colissimo.fr",
          callBackFrame: callbackId.current,
          ceCountry: "FR",
          ceAddress: defaultAddress?.address || "",
          ceZipCode: defaultAddress?.zipCode || "",
          ceTown: defaultAddress?.city || "",
          origin: "WIDGET",
          filterRelay: "1", // Tous les points de retrait
          token,
          dyPreparationTime: 1, // 1 jour ouvrable de préparation
        };

        console.log("Configuration du widget Colissimo:", widgetOptions);

        // Définir la callback globale unique pour cette instance
         
        window[callbackId.current] = (point: PointRetrait) => {
          console.log("Point de retrait sélectionné:", point);
          onSelect(point);

          // Fermer le widget après sélection
          try {
             
            if (($ as JQueryWithColissimo).fn.frameColissimoClose) {
              container.frameColissimoClose();
            }
          } catch (closeError) {
            console.warn("Erreur lors de la fermeture du widget:", closeError);
          }
        };

        // Initialiser le widget
        console.log("Initialisation du widget Colissimo...");
        container.frameColissimoOpen(widgetOptions);

        console.log("Widget Colissimo initialisé avec succès");
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        console.error("Erreur lors de l'initialisation du widget Colissimo:", err);
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      }
    };

    initializeWidget();

    // Cleanup function
    return () => {
      // Nettoyer la callback globale
      const currentCallbackId = callbackId.current; // Copy to avoid ref issues
       
      if (window[currentCallbackId]) {
        delete window[currentCallbackId];
      }

      // Fermer le widget s'il est ouvert
      try {
        const currentContainer = containerRef.current; // Copy to avoid ref issues
        if (currentContainer) {
          $(currentContainer).frameColissimoClose();
        }
      } catch (closeError) {
        console.warn("Erreur lors du nettoyage du widget:", closeError);
      }
    };
  }, [token, defaultAddress, onSelect, onError]);

  if (error) {
    return (
      <aside className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`} role="alert">
        <header className="flex items-center text-red-800">
          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">Erreur de chargement du widget Colissimo</span>
        </header>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </aside>
    );
  }

  return (
    <section
      className={`relative ${className}`}
      aria-label="Sélection du point de retrait Colissimo"
    >
      {isLoading && (
        <aside
          className="flex items-center justify-center rounded-lg bg-gray-50 p-8"
          role="status"
          aria-live="polite"
        >
          <header className="flex items-center space-x-2">
            <span
              className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"
              aria-hidden="true"
            ></span>
            <span className="text-sm text-gray-600">Chargement du widget Colissimo...</span>
          </header>
        </aside>
      )}

      <main
        ref={containerRef}
        id="colissimo-widget-container"
        className={`${isLoading ? "hidden" : ""}`}
        aria-label="Interface de sélection des points de retrait"
      />
    </section>
  );
}
