import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { NewsletterDashboard } from "@/components/features/admin/newsletter/newsletter-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Users, UserCheck, UserMinus, TrendingUp } from "lucide-react";
import { getNewsletterStats, getNewsletterSubscribers } from "@/actions/newsletterActions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminNewsletter" });

  return {
    title: `${t("title")} | Administration`,
    description: t("description"),
  };
}

export default async function AdminNewsletterPage({ params }: Props) {
  const { locale } = await params;

  // Check authentication and admin role
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await checkAdminRole(user.id);
  if (!isAdmin) {
    redirect("/");
  }

  // Fetch newsletter data
  const [statsResult, subscribersResult] = await Promise.all([
    getNewsletterStats(),
    getNewsletterSubscribers(),
  ]);

  const stats = statsResult.success ? statsResult.data : null;
  const subscribers = subscribersResult.success ? subscribersResult.data : [];

  const t = await getTranslations({ locale, namespace: "AdminNewsletter" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Abonnés</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subscribers}</div>
              <p className="text-xs text-muted-foreground">Tous les abonnés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actifs</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_subscribers}</div>
              <p className="text-xs text-muted-foreground">Abonnés actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
              <UserMinus className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactive_subscribers}</div>
              <p className="text-xs text-muted-foreground">Désabonnés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ce mois</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recent_subscriptions}</div>
              <p className="text-xs text-muted-foreground">Nouveaux abonnés</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error handling */}
      {!statsResult.success && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <Mail className="h-5 w-5" />
              <p>Erreur lors du chargement des statistiques: {statsResult.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!subscribersResult.success && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <Mail className="h-5 w-5" />
              <p>Erreur lors du chargement des abonnés: {subscribersResult.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Newsletter Dashboard */}
      <NewsletterDashboard subscribers={subscribers || []} />
    </div>
  );
}
