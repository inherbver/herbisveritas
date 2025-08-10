import { redirect } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMarketsFromDb } from "@/lib/markets/queries";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Admin Markets Page
 *
 * Liste et gestion des marchés pour les administrateurs
 */
export default async function AdminMarketsPage() {
  // 1. Check admin permissions
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isAdmin = await checkAdminRole(user.id);
  if (!isAdmin) {
    redirect("/");
  }

  // 2. Fetch markets data
  const markets = await getMarketsFromDb();

  return (
    <DashboardShell
      title="Gestion des Marchés"
      description="Gérer les marchés et leurs informations"
      headerAction={
        <Link href="/admin/markets/new">
          <Button>Ajouter un marché</Button>
        </Link>
      }
    >
      <div className="grid gap-4">
        {markets.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun marché</CardTitle>
              <CardDescription>Aucun marché n'est configuré pour le moment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/markets/new">
                <Button>Créer le premier marché</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          markets.map((market) => (
            <Card key={market.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {market.name}
                      <Badge variant={market.is_active ? "default" : "secondary"}>
                        {market.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {market.city} • {market.address}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/markets/${market.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Période:</span>{" "}
                    {new Date(market.start_date).toLocaleDateString("fr-FR")} -{" "}
                    {new Date(market.end_date).toLocaleDateString("fr-FR")}
                  </div>
                  <div>
                    <span className="font-medium">Horaires:</span> {market.start_time} -{" "}
                    {market.end_time}
                  </div>
                  <div>
                    <span className="font-medium">Jour:</span>{" "}
                    {
                      ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][
                        market.day_of_week
                      ]
                    }
                  </div>
                  {market.description && (
                    <div className="col-span-2">
                      <span className="font-medium">Description:</span> {market.description}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
