"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { PointRetrait } from "@/mocks/colissimo-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

// Lazy load widgets for better performance
const ColissimoWidget = dynamic(() => import("./ColissimoWidget"), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
});

const MockColissimoWidget = dynamic(() => import("./MockColissimoWidget"), {
  ssr: false,
  loading: () => <WidgetSkeleton />,
});

interface DefaultAddress {
  address?: string;
  zipCode?: string;
  city?: string;
}

interface ColissimoWidgetWrapperProps {
  defaultAddress?: DefaultAddress;
  onSelect: (point: PointRetrait) => void;
  onError?: (error: string) => void;
  className?: string;
  forceMode?: "mock" | "real"; // For testing purposes
}

function WidgetSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-4 rounded-lg border p-6">
      <div className="h-6 w-3/4 rounded bg-gray-200"></div>
      <div className="h-4 w-1/2 rounded bg-gray-200"></div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded bg-gray-100"></div>
        ))}
      </div>
    </div>
  );
}

export default function ColissimoWidgetWrapper({
  defaultAddress,
  onSelect,
  onError,
  className = "",
  forceMode,
}: ColissimoWidgetWrapperProps) {
  const [colissimoToken, setColissimoToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [useMockWidget, setUseMockWidget] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    // Force mode for testing
    if (forceMode) {
      setUseMockWidget(forceMode === "mock");
      if (forceMode === "real") {
        fetchColissimoToken();
      }
      return;
    }

    // In development or if explicitly set to use mock
    const shouldUseMock =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_USE_MOCK_COLISSIMO === "true";

    if (shouldUseMock) {
      setUseMockWidget(true);
    } else {
      // Try to get real token
      fetchColissimoToken();
    }
  }, [forceMode]);

  const fetchColissimoToken = async () => {
    setIsLoadingToken(true);
    setTokenError(null);

    try {
      const response = await fetch("/api/colissimo-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.token) {
        setColissimoToken(data.token);
        setUseMockWidget(false);
      } else {
        throw new Error("Token non reçu");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du token Colissimo:", error);
      setTokenError(error instanceof Error ? error.message : "Erreur inconnue");

      // Fallback to mock widget if token fetch fails
      console.log("Utilisation du widget mock suite à l'échec de récupération du token");
      setUseMockWidget(true);
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Show loading state while determining which widget to use
  if (isLoadingToken && !forceMode) {
    return <WidgetSkeleton />;
  }

  return (
    <div className={className}>
      {/* Show info alert in development */}
      {useMockWidget && process.env.NODE_ENV === "development" && (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Mode développement :</strong> Utilisation du widget Colissimo simulé. Les
            données affichées sont des exemples pour le développement.
          </AlertDescription>
        </Alert>
      )}

      {/* Show error if token fetch failed but we're using mock as fallback */}
      {tokenError && useMockWidget && process.env.NODE_ENV !== "development" && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger le widget Colissimo réel. Utilisation d'une version simplifiée.
            {tokenError && <span className="mt-1 block text-xs">Erreur: {tokenError}</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Render appropriate widget */}
      {useMockWidget ? (
        <MockColissimoWidget
          defaultAddress={defaultAddress}
          onSelect={onSelect}
          onError={onError}
          className={className}
        />
      ) : (
        colissimoToken && (
          <ColissimoWidget
            token={colissimoToken}
            defaultAddress={defaultAddress}
            onSelect={onSelect}
            onError={onError}
            className={className}
          />
        )
      )}
    </div>
  );
}
