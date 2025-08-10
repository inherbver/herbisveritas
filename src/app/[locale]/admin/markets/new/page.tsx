import { redirect } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MarketForm } from "../market-form";

/**
 * New Market Page
 *
 * Page de création d'un nouveau marché
 */
export default async function NewMarketPage() {
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
      title="Nouveau Marché"
      description="Créer un nouveau marché"
      headerAction={
        <Link href="/admin/markets">
          <Button variant="outline">Retour</Button>
        </Link>
      }
    >
      <MarketForm />
    </DashboardShell>
  );
}
