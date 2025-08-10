import { redirect } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllPartners } from "@/lib/markets/queries";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Admin Partners Page
 *
 * Liste et gestion des partenaires pour les administrateurs
 */
export default async function AdminPartnersPage() {
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

  // 2. Fetch partners data (includes inactive ones for admin)
  const partners = await getAllPartners();

  return (
    <DashboardShell
      title="Gestion des Partenaires"
      description="Gérer les partenaires et leurs informations"
      headerAction={
        <Link href="/admin/partners/new">
          <Button>Ajouter un partenaire</Button>
        </Link>
      }
    >
      <div className="grid gap-4">
        {partners.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun partenaire</CardTitle>
              <CardDescription>Aucun partenaire n'est configuré pour le moment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/partners/new">
                <Button>Créer le premier partenaire</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          partners.map((partner) => (
            <Card key={partner.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {partner.name}
                      <Badge variant={partner.isActive ? "default" : "secondary"}>
                        {partner.isActive ? "Actif" : "Inactif"}
                      </Badge>
                      <Badge variant="outline">Ordre: {partner.displayOrder}</Badge>
                    </CardTitle>
                    <CardDescription>{partner.address}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/partners/${partner.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{partner.description}</p>
                  {partner.facebookUrl && (
                    <div className="text-sm">
                      <span className="font-medium">Facebook:</span>{" "}
                      <a
                        href={partner.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {partner.facebookUrl}
                      </a>
                    </div>
                  )}
                  {partner.imageUrl && (
                    <div className="text-sm">
                      <span className="font-medium">Image:</span>{" "}
                      <a
                        href={partner.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Voir l'image
                      </a>
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
