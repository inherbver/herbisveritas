"use client";

import { useAdminMonitoring } from "@/hooks/use-admin-monitoring";
import { AlertTriangle, ShieldCheck, Loader2, RefreshCw } from "lucide-react";

export function AdminStatus() {
  const { threats, isLoading, error, lastCheck, forceCheck } = useAdminMonitoring();

  if (isLoading && !lastCheck) {
    return (
      <aside className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-gray-800 dark:text-blue-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>Vérification de la sécurité en cours...</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400">
        <header className="flex items-center gap-3 font-bold">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg">Erreur de surveillance</h3>
        </header>
        <section className="mt-2">
          <p>Impossible de vérifier le statut des administrateurs : {error.message}</p>
        </section>
      </aside>
    );
  }

  if (threats.length === 0) {
    return (
      <aside className="mb-4 flex items-center justify-between rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-gray-800 dark:text-green-400">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5" />
          <p>
            <strong>Sécurité optimale :</strong> Aucun administrateur non autorisé détecté.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {lastCheck && <span>Dernière vérif. à {new Date(lastCheck).toLocaleTimeString()}</span>}
          <button
            onClick={() => forceCheck()}
            disabled={isLoading}
            className="hover:text-green-900 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-gray-800 dark:text-yellow-300">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg">Alerte de Sécurité</h3>
        </div>
        <button
          onClick={() => forceCheck()}
          disabled={isLoading}
          className="flex items-center gap-2 hover:text-yellow-900 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Rafraîchir</span>
        </button>
      </header>
      <section className="mt-2 pl-8">
        <p>
          <strong>{threats.length} compte(s) administrateur(s) non autorisé(s) détecté(s).</strong>{" "}
          Veuillez vérifier et révoquer leurs privilèges immédiatement.
        </p>
        <ul className="mt-2 list-disc pl-5">
          {threats.map((threat) => (
            <li key={threat.id}>
              Utilisateur: {threat.email || "Email non disponible"} (ID: {threat.id})
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
