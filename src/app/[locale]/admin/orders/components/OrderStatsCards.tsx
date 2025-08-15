import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, Truck, CheckCircle, XCircle, Euro, TrendingUp } from "lucide-react";
import { getOrderStatsAction } from "@/actions/orderActions";

export async function OrderStatsCards() {
  return (
    <Suspense fallback={<OrderStatsCardsSkeleton />}>
      <OrderStatsCardsContent />
    </Suspense>
  );
}

async function OrderStatsCardsContent() {
  const result = await getOrderStatsAction();

  if (!result.success || !result.data) {
    return <OrderStatsError error={result.error} />;
  }

  const stats = result.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };

  const statsCards = [
    {
      title: "Commandes totales",
      value: stats.total_orders.toLocaleString("fr-FR"),
      description: `${stats.orders_today} aujourd'hui`,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "En attente",
      value: stats.pending_orders.toLocaleString("fr-FR"),
      description: formatPercentage(stats.pending_orders, stats.total_orders),
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "En traitement",
      value: stats.processing_orders.toLocaleString("fr-FR"),
      description: formatPercentage(stats.processing_orders, stats.total_orders),
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Expédiées",
      value: stats.shipped_orders.toLocaleString("fr-FR"),
      description: formatPercentage(stats.shipped_orders, stats.total_orders),
      icon: Truck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Livrées",
      value: stats.delivered_orders.toLocaleString("fr-FR"),
      description: formatPercentage(stats.delivered_orders, stats.total_orders),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Annulées",
      value: stats.cancelled_orders.toLocaleString("fr-FR"),
      description: formatPercentage(stats.cancelled_orders, stats.total_orders),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(stats.total_revenue),
      description: `${formatCurrency(stats.revenue_today)} aujourd'hui`,
      icon: Euro,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Panier moyen",
      value: formatCurrency(stats.average_order_value),
      description: "Toutes commandes payées",
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} ${stat.color} rounded-md p-2`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>

            {/* Indicateur de progression visuel pour certaines cartes */}
            {["En attente", "En traitement", "Expédiées", "Livrées", "Annulées"].includes(
              stat.title
            ) && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-muted">
                <div
                  className={`h-full transition-all duration-300 ${stat.color.replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.min((parseInt(stat.value.replace(/\s/g, "")) / Math.max(stats.total_orders, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function OrderStatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrderStatsError({ error }: { error?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="md:col-span-2 lg:col-span-4">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <XCircle className="mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-semibold">Erreur de chargement</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {error || "Impossible de charger les statistiques"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { OrderStatsCardsSkeleton };
