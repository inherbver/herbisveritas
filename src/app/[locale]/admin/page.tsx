// src/app/[locale]/admin/page.tsx
import { Locale } from "@/i18n-config";
import { DashboardShell } from "@/components/admin/dashboard-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AdminPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AdminDashboardPage(_props: AdminPageProps) {
  // const { locale } = await props.params;
  // now you can safely use `locale`…

  // const t = await getTranslations({ locale, namespace: "AdminPage" });

  return (
    <DashboardShell title="Vue d'ensemble">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenus Totaux</CardTitle>
            <CardDescription>Ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€1,234.56</p>
          </CardContent>
        </Card>
        {/* Add more KPI cards here */}
      </div>
    </DashboardShell>
  );
}
