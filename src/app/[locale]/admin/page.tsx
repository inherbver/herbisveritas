import { getTranslations } from "next-intl/server";
import { Locale } from "@/i18n-config";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import {
  MobileDashboardGrid,
  DesktopDashboardGrid,
} from "@/components/features/admin/mobile-dashboard-grid";
import { ActivityLog } from "@/components/features/admin/ActivityLog";
import { getRecentActivityLogs } from "@/lib/admin/dashboard";

// Disable caching to ensure real-time event updates
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AdminPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AdminDashboardPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminDashboard" });
  const recentActivity = await getRecentActivityLogs();

  return (
    <DashboardShell title={t("title")}>
      {/* Mobile Dashboard Grid - Visible only on mobile */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-semibold md:hidden">Navigation rapide</h2>
        <MobileDashboardGrid />
      </section>

      {/* Desktop Dashboard Grid - Visible only on desktop */}
      <section className="mb-8">
        <h2 className="mb-4 hidden text-lg font-semibold md:block">Sections du tableau de bord</h2>
        <DesktopDashboardGrid />
      </section>

      {/* Performance Monitoring masqué temporairement */}
      {/* 
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Performance et Monitoring</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/performance" className="block transition-transform hover:scale-105">
            <Card className="h-full transition-all hover:shadow-xl border-2 border-red-200 hover:border-red-300">
              <CardHeader>
                <div className="mb-3 inline-flex rounded-lg p-4 text-red-600 bg-red-100">
                  <Activity className="h-8 w-8" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  Monitoring Performance
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">NOUVEAU</span>
                </CardTitle>
                <CardDescription>
                  Surveillez les performances en temps réel : cache, base de données, rendu
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          
          <Card className="border-green-200">
            <CardHeader>
              <div className="mb-3 inline-flex rounded-lg p-4 text-green-600 bg-green-100">
                <TrendingUp className="h-8 w-8" />
              </div>
              <CardTitle>Optimisations Actives</CardTitle>
              <CardDescription>
                Cache multi-niveaux, index DB, monitoring automatique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Système optimisé</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200">
            <CardHeader>
              <div className="mb-3 inline-flex rounded-lg p-4 text-blue-600 bg-blue-100">
                <Zap className="h-8 w-8" />
              </div>
              <CardTitle>Gains de Performance</CardTitle>
              <CardDescription>
                Réduction des temps de chargement et optimisation des requêtes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Dashboard</span>
                  <span className="text-green-600 font-medium">-94%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Commandes</span>
                  <span className="text-green-600 font-medium">-82%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      */}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Add more KPI cards here */}
      </section>

      <section className="mt-8">
        <ActivityLog
          logs={recentActivity}
          title={t("activityLog.title")}
          description={t("activityLog.description")}
        />
      </section>
    </DashboardShell>
  );
}
