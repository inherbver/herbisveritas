import { redirect } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PartnerForm } from "../partner-form";

/**
 * New Partner Page
 *
 * Page de création d'un nouveau partenaire
 */
export default async function NewPartnerPage() {
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

  return (
    <DashboardShell
      title="Nouveau Partenaire"
      description="Créer un nouveau partenaire"
      headerAction={
        <Link href="/admin/partners">
          <Button variant="outline">Retour</Button>
        </Link>
      }
    >
      <PartnerForm />
    </DashboardShell>
  );
}
