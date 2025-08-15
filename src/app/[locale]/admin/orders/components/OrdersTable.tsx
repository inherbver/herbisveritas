"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Truck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getOrdersListAction, updateOrderStatusAction } from "@/actions/orderActions";
import type {
  OrderListOptions,
  OrderWithRelations,
  OrderStatus,
  PaymentStatus,
} from "@/types/orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types/orders";

interface OrdersTableProps {
  initialOptions: OrderListOptions;
}

export function OrdersTable({ initialOptions }: OrdersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialOptions.page || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState(initialOptions.filters?.search || "");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "all">("all");

  const loadOrders = async (options: OrderListOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getOrdersListAction(options);

      if (result.success && result.data) {
        setOrders(result.data.orders);
        setTotalCount(result.data.total_count);
        setCurrentPage(result.data.page);
      } else {
        setError(result.error || "Erreur lors du chargement");
      }
    } catch (error) {
      setError("Erreur inattendue");
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(initialOptions);
  }, [initialOptions]);

  const updateUrlAndLoad = (newOptions: OrderListOptions) => {
    const params = new URLSearchParams();

    if (newOptions.page && newOptions.page > 1) {
      params.set("page", newOptions.page.toString());
    }

    if (newOptions.filters?.search) {
      params.set("search", newOptions.filters.search);
    }

    if (newOptions.filters?.status?.length) {
      newOptions.filters.status.forEach((status) => params.append("status", status));
    }

    if (newOptions.filters?.payment_status?.length) {
      newOptions.filters.payment_status.forEach((status) =>
        params.append("payment_status", status)
      );
    }

    const newUrl = params.toString() ? `?${params.toString()}` : "";

    startTransition(() => {
      router.push(`/admin/orders${newUrl}`, { scroll: false });
      loadOrders(newOptions);
    });
  };

  const handleSearch = () => {
    const options: OrderListOptions = {
      ...initialOptions,
      page: 1,
      filters: {
        ...initialOptions.filters,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? [statusFilter] : undefined,
        payment_status: paymentStatusFilter !== "all" ? [paymentStatusFilter] : undefined,
      },
    };
    updateUrlAndLoad(options);
  };

  const handlePageChange = (newPage: number) => {
    const options: OrderListOptions = {
      ...initialOptions,
      page: newPage,
    };
    updateUrlAndLoad(options);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const result = await updateOrderStatusAction(orderId, { status: newStatus });

      if (result.success) {
        // Recharger les données
        loadOrders({ ...initialOptions, page: currentPage });
      } else {
        alert(result.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erreur inattendue");
    }
  };

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      warning: "outline",
      info: "secondary",
      primary: "default",
      success: "secondary",
      destructive: "destructive",
    };
    return colorMap[ORDER_STATUS_COLORS[status]] || "default";
  };

  const totalPages = Math.ceil(totalCount / (initialOptions.limit || 25));

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Erreur: {error}</p>
            <Button onClick={() => loadOrders(initialOptions)} className="mt-4" variant="outline">
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
          <CardDescription>Recherchez et filtrez les commandes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="text-sm font-medium">
                Recherche
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Numéro de commande, email client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium">Statut</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium">Paiement</label>
              <Select
                value={paymentStatusFilter}
                onValueChange={(value) => setPaymentStatusFilter(value as PaymentStatus | "all")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les paiements</SelectItem>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            {isLoading && (
              <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {isLoading ? "Chargement..." : "Aucune commande trouvée"}
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">
                        {order.order_number || order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {order.profile?.first_name} {order.profile?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{order.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={order.payment_status === "succeeded" ? "secondary" : "outline"}
                        >
                          {PAYMENT_STATUS_LABELS[order.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total_amount, order.currency)}</TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(order.id, "processing")}
                              disabled={order.status === "processing"}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Marquer en traitement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(order.id, "shipped")}
                              disabled={order.status === "shipped" || order.status === "delivered"}
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              Marquer expédié
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage de {(currentPage - 1) * (initialOptions.limit || 25) + 1} à{" "}
            {Math.min(currentPage * (initialOptions.limit || 25), totalCount)} sur {totalCount}{" "}
            commandes
          </p>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || isPending}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm">
              Page {currentPage} sur {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || isPending}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
