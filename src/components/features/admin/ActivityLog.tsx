"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ActivityLogItem, EventSeverity } from "@/lib/admin/dashboard";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { EventLogFilters } from "./EventLogFilters";
import type { EventLogFilters as EventLogFiltersType } from "@/types/event-filters";
import { DEFAULT_FILTERS } from "@/types/event-filters";

// Composant pour éviter les erreurs d'hydratation avec les timestamps
function TimeAgo({ timestamp }: { timestamp: string }) {
  const [timeAgo, setTimeAgo] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const updateTimeAgo = () => {
      setTimeAgo(
        formatDistanceToNow(new Date(timestamp), {
          addSuffix: true,
          locale: fr,
        })
      );
    };

    updateTimeAgo();
    // Mettre à jour toutes les minutes
    const interval = setInterval(updateTimeAgo, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  // Pendant l'hydratation, afficher la date fixe pour éviter les erreurs
  if (!isClient) {
    return <span>{new Date(timestamp).toLocaleDateString("fr-FR")}</span>;
  }

  return <span>{timeAgo}</span>;
}

interface ActivityLogProps {
  logs: ActivityLogItem[];
  title: string;
  description: string;
}

function getSeverityVariant(
  severity: EventSeverity
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "INFO":
      return "default";
    case "WARNING":
      return "secondary";
    case "ERROR":
      return "destructive";
    case "CRITICAL":
      return "destructive";
    default:
      return "outline";
  }
}

function getSeverityColor(severity: EventSeverity): string {
  switch (severity) {
    case "INFO":
      return "text-blue-600";
    case "WARNING":
      return "text-orange-600";
    case "ERROR":
      return "text-red-600";
    case "CRITICAL":
      return "text-red-800";
    default:
      return "text-gray-600";
  }
}

export function ActivityLog({ logs, title, description }: ActivityLogProps) {
  const [filters, setFilters] = useState<EventLogFiltersType>(DEFAULT_FILTERS);

  // Logique de filtrage des logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtre par sévérité
      if (filters.severity.length > 0 && !filters.severity.includes(log.severity)) {
        return false;
      }

      // Filtre par type d'événement
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(log.type)) {
        return false;
      }

      // Filtre par plage de dates
      if (filters.dateRange) {
        const logDate = new Date(log.timestamp);
        const { start, end } = filters.dateRange;
        if (logDate < start || logDate > end) {
          return false;
        }
      }

      // Filtre par recherche textuelle
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesDescription = log.description.toLowerCase().includes(searchTerm);
        const matchesUserEmail = log.user_email.toLowerCase().includes(searchTerm);
        const matchesEventType = log.type.toLowerCase().includes(searchTerm);

        if (!matchesDescription && !matchesUserEmail && !matchesEventType) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filters]);

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <EventLogFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={logs.length}
        filteredCount={filteredLogs.length}
      />

      {/* Table des événements */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          variant={getSeverityVariant(log.severity)}
                          className={getSeverityColor(log.severity)}
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.description}</TableCell>
                      <TableCell>{log.user_email}</TableCell>
                      <TableCell>
                        <TimeAgo timestamp={log.timestamp} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : logs.length > 0 ? (
            <div className="py-8 text-center">
              <p className="mb-2 text-sm text-muted-foreground">
                Aucun événement ne correspond aux filtres sélectionnés.
              </p>
              <p className="text-xs text-muted-foreground">
                Essayez de modifier ou de supprimer certains filtres.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune activité récente à afficher.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
