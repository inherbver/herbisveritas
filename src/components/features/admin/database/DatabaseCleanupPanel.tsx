"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Trash2, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CleanupStats {
  stat_name: string;
  stat_value: number;
  description: string;
}

interface CleanupResult {
  success: boolean;
  deleted_carts?: number;
  deleted_items?: number;
  message?: string;
  preview?: unknown[];
}

export function DatabaseCleanupPanel() {
  const [stats, setStats] = useState<CleanupStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Charger les statistiques au montage
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch("/api/admin/database/cleanup-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error("Erreur lors du chargement des statistiques");
      }
    } catch (error) {
      console.error("Erreur stats:", error);
      toast.error("Erreur de connexion");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const runCleanup = async (dryRun: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/database/cleanup-guest-carts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dryRun,
          maxAgeHours: 24 * 14, // 14 jours
          batchSize: 100,
        }),
      });

      const result: CleanupResult = await response.json();

      if (result.success) {
        if (dryRun) {
          toast.info(
            result.message ||
              `Simulation: ${result.preview?.length || 0} paniers seraient supprimés`
          );
        } else {
          toast.success(
            `Nettoyage terminé: ${result.deleted_carts || 0} paniers et ${result.deleted_items || 0} items supprimés`
          );
          // Recharger les stats après le nettoyage
          await loadStats();
        }
      } else {
        toast.error(result.message || "Erreur lors du nettoyage");
      }
    } catch (error) {
      console.error("Erreur cleanup:", error);
      toast.error("Erreur lors du nettoyage");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatBadgeVariant = (statName: string, value: number) => {
    switch (statName) {
      case "expired_guest_carts":
        return value > 50 ? "destructive" : value > 10 ? "default" : "secondary";
      case "old_audit_logs":
        return value > 1000 ? "destructive" : value > 100 ? "default" : "secondary";
      default:
        return "outline";
    }
  };

  const getStatIcon = (statName: string) => {
    switch (statName) {
      case "total_carts":
      case "guest_carts":
        return "🛒";
      case "expired_guest_carts":
        return "⏰";
      case "old_audit_logs":
        return "📝";
      case "total_cart_items":
        return "📦";
      default:
        return "📊";
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fr-FR").format(num);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques de la Base de Données
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des données stockées et optimisations possibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">État Actuel</h3>
            <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoadingStats}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingStats ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          {isLoadingStats ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.stat_name}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getStatIcon(stat.stat_name)}</span>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.description}</p>
                      <p className="text-2xl font-bold">{formatNumber(stat.stat_value)}</p>
                    </div>
                  </div>
                  <Badge variant={getStatBadgeVariant(stat.stat_name, stat.stat_value)}>
                    {stat.stat_value > 0 ? "Actif" : "Vide"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Nettoyage des Paniers Invités
          </CardTitle>
          <CardDescription>
            Supprime automatiquement les paniers invités de plus de 14 jours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Important</p>
              <p className="text-amber-700">
                Cette opération supprime définitivement les paniers invités expirés et leurs
                articles. Testez d'abord avec la simulation.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => runCleanup(true)} disabled={isLoading}>
              🔍 Simuler le Nettoyage
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Nettoyage en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Exécuter le Nettoyage
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer le Nettoyage</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action va supprimer définitivement tous les paniers invités de plus de 14
                    jours ainsi que leurs articles associés.
                    <br />
                    <br />
                    Cette opération est irréversible. Êtes-vous sûr de vouloir continuer ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => runCleanup(false)}
                    className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                  >
                    Confirmer la Suppression
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
