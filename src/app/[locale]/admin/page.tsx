import { getTranslations } from "next-intl/server";
import { Locale } from "@/i18n-config";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";

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
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* <Card>
          <CardHeader>
            <CardTitle>{t("kpi.totalRevenue.title")}</CardTitle>
            <CardDescription>{t("kpi.totalRevenue.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€1,234.56</p>
          </CardContent>
        </Card> */}
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
