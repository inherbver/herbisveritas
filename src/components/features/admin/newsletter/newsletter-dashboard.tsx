"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Mail,
  MoreVertical,
  Search,
  Filter,
  Download,
  UserCheck,
  UserMinus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { toggleNewsletterSubscriber } from "@/actions/newsletterActions";
import type { NewsletterSubscriber } from "@/types/newsletter";

interface NewsletterDashboardProps {
  subscribers: NewsletterSubscriber[];
}

export function NewsletterDashboard({ subscribers: initialSubscribers }: NewsletterDashboardProps) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isPending, startTransition] = useTransition();

  // Filter subscribers based on search and status
  const filteredSubscribers = subscribers.filter((subscriber) => {
    const matchesSearch = subscriber.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && subscriber.is_active) ||
      (filterStatus === "inactive" && !subscriber.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        const result = await toggleNewsletterSubscriber(id, !currentStatus);

        if (result.success) {
          // Update local state
          setSubscribers((prev) =>
            prev.map((sub) => (sub.id === id ? { ...sub, is_active: !currentStatus } : sub))
          );
          toast.success(result.message);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error("Erreur inattendue");
        console.error("Toggle subscriber error:", error);
      }
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Email", "Statut", "Date d'inscription", "Source", "IP"],
      ...filteredSubscribers.map((sub) => [
        sub.email,
        sub.is_active ? "Actif" : "Inactif",
        format(new Date(sub.subscribed_at), "dd/MM/yyyy HH:mm", { locale: fr }),
        sub.source || "N/A",
        sub.ip_address || "N/A",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV téléchargé");
  };

  const activeCount = subscribers.filter((s) => s.is_active).length;
  const inactiveCount = subscribers.length - activeCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Gestion des Abonnés</span>
        </CardTitle>
        <CardDescription>
          Gérez vos {subscribers.length} abonnés newsletter ({activeCount} actifs, {inactiveCount}{" "}
          inactifs)
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Controls */}
        <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterStatus === "all"
                    ? "Tous"
                    : filterStatus === "active"
                      ? "Actifs"
                      : "Inactifs"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                  Tous les abonnés
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                  Actifs seulement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>
                  Inactifs seulement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Subscribers Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date d'inscription</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                      <Mail className="h-8 w-8" />
                      <p>
                        {searchTerm || filterStatus !== "all"
                          ? "Aucun abonné trouvé avec ces critères"
                          : "Aucun abonné pour le moment"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={subscriber.is_active ? "default" : "secondary"}
                        className={
                          subscriber.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {subscriber.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(subscriber.subscribed_at), "dd/MM/yyyy à HH:mm", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {subscriber.source || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isPending}>
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(subscriber.id, subscriber.is_active)}
                            disabled={isPending}
                          >
                            {subscriber.is_active ? (
                              <>
                                <UserMinus className="mr-2 h-4 w-4" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Réactiver
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {filteredSubscribers.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Affichage de {filteredSubscribers.length} abonné(s) sur {subscribers.length} au total
          </div>
        )}
      </CardContent>
    </Card>
  );
}
