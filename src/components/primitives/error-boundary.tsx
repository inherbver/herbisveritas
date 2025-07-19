"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button"; // Pour un bouton de rafraîchissement
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Permet de fournir un fallback personnalisé
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Mettez à jour l'état afin que le prochain rendu affiche l'interface utilisateur de repli.
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Vous pouvez également enregistrer l'erreur dans un service de reporting d'erreurs
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // Exemple: logErrorToMyService(error, errorInfo);
  }

  private handleReset = () => {
    // Tentative de réinitialisation - peut nécessiter une logique plus complexe
    // selon la cause de l'erreur (ex: recharger la page, effacer le state, etc.)
    this.setState({ hasError: false, error: undefined });
    // Optionnellement, forcer un rechargement
    // window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Vous pouvez rendre n'importe quelle interface utilisateur de repli.
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div role="alert" className="p-4">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Oups ! Une erreur est survenue.</AlertTitle>
            <AlertDescription>
              <p>Quelque chose s&apos;est mal passé. Veuillez réessayer.</p>
              {/* Affiche l'erreur en développement pour faciliter le débogage */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.error.message}</pre>
              )}
              <Button onClick={this.handleReset} variant="secondary" size="sm" className="mt-4">
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
