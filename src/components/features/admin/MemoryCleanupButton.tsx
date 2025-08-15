"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";

export function MemoryCleanupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<string | null>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/memory-cleanup', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastCleanup(`Mémoire libérée: ${data.memoryFreed}MB`);
        // Recharger la page après 2 secondes pour voir les nouveaux chiffres
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setLastCleanup('Erreur lors du nettoyage');
      }
    } catch (error) {
      setLastCleanup('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleCleanup}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {isLoading ? "Nettoyage..." : "Nettoyer Mémoire"}
      </Button>
      {lastCleanup && (
        <p className="text-xs text-muted-foreground">{lastCleanup}</p>
      )}
    </div>
  );
}