import { Suspense } from "react";
import { Package, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersTable } from "./components/OrdersTable";
import { OrderStatsCards } from "./components/OrderStatsCards";
import type { OrderListOptions } from "@/types/orders";

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = await searchParams;

  // Construction des options de filtre à partir des searchParams
  const buildFiltersFromParams = (): OrderListOptions => {
    const options: OrderListOptions = {
      page: resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1,
      limit: resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit as string) : 25,
    };

    // Filtres
    const filters: Record<string, unknown> = {};

    if (resolvedSearchParams.status) {
      const statusArray = Array.isArray(resolvedSearchParams.status)
        ? resolvedSearchParams.status
        : [resolvedSearchParams.status];
      filters.status = statusArray;
    }

    if (resolvedSearchParams.payment_status) {
      const paymentStatusArray = Array.isArray(resolvedSearchParams.payment_status)
        ? resolvedSearchParams.payment_status
        : [resolvedSearchParams.payment_status];
      filters.payment_status = paymentStatusArray;
    }

    if (resolvedSearchParams.search) {
      filters.search = resolvedSearchParams.search as string;
    }

    if (resolvedSearchParams.date_from) {
      filters.date_from = resolvedSearchParams.date_from as string;
    }

    if (resolvedSearchParams.date_to) {
      filters.date_to = resolvedSearchParams.date_to as string;
    }

    if (resolvedSearchParams.min_amount) {
      filters.min_amount = parseFloat(resolvedSearchParams.min_amount as string);
    }

    if (resolvedSearchParams.max_amount) {
      filters.max_amount = parseFloat(resolvedSearchParams.max_amount as string);
    }

    if (Object.keys(filters).length > 0) {
      options.filters = filters;
    }

    // Tri
    if (resolvedSearchParams.sort) {
      const [field, direction] = (resolvedSearchParams.sort as string).split(".");
      if (field && direction && ["asc", "desc"].includes(direction)) {
        options.sort = {
          field: field as "created_at" | "total_amount" | "status" | "order_number",
          direction: direction as "asc" | "desc",
        };
      }
    }

    return options;
  };

  const options = buildFiltersFromParams();

  return (
    <main className="container mx-auto space-y-8 py-8">
      {/* En-tête de page */}
      <header className="flex items-center justify-between">
        <section>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Package className="h-8 w-8 text-primary" />
            Gestion des Commandes
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gérez et suivez toutes les commandes de votre boutique
          </p>
        </section>

        <nav className="flex items-center gap-3" role="toolbar" aria-label="Actions principales">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </nav>
      </header>

      {/* Cartes de statistiques */}
      <section aria-label="Statistiques des commandes">
        <Suspense fallback={<OrderStatsCardsSkeleton />}>
          <OrderStatsCards />
        </Suspense>
      </section>

      {/* Tableau principal avec filtres */}
      <section aria-label="Liste et gestion des commandes">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Liste des Commandes
            </CardTitle>
            <CardDescription>
              Recherchez, filtrez et gérez toutes les commandes clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<OrdersTableSkeleton />}>
              <OrdersTable initialOptions={options} />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

// Composants de loading
function OrderStatsCardsSkeleton() {
  return (
    <section
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      aria-label="Chargement des statistiques"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <article key={i}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        </article>
      ))}
    </section>
  );
}

function OrdersTableSkeleton() {
  return (
    <article className="space-y-4">
      {/* Barre de recherche et filtres */}
      <header className="flex items-center justify-between">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-10 w-32" />
      </header>

      {/* Tableau */}
      <section className="rounded-md border">
        <header className="bg-muted/50 flex h-12 items-center border-b px-4">
          <nav className="flex w-full items-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </nav>
        </header>

        {/* Lignes */}
        <section>
          {Array.from({ length: 5 }).map((_, i) => (
            <article key={i} className="flex h-16 items-center border-b px-4">
              <nav className="flex w-full items-center space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded" />
              </nav>
            </article>
          ))}
        </section>
      </section>

      {/* Pagination */}
      <footer className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <nav className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </nav>
      </footer>
    </article>
  );
}
