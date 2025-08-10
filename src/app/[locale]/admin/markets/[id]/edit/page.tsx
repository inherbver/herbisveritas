import { redirect, notFound } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMarketById } from "@/lib/markets/queries";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MarketForm } from "../../market-form";

interface EditMarketPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit Market Page
 *
 * Page de modification d'un marché existant
 */
export default async function EditMarketPage({ params }: EditMarketPageProps) {
  const { id } = await params;

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

  // 2. Fetch market data
  const market = await getMarketById(id);

  if (!market) {
    notFound();
  }

  return (
    <DashboardShell
      title={`Modifier: ${market.name}`}
      description="Modifier les informations du marché"
      headerAction={
        <div className="flex gap-2">
          <Link href={`/admin/markets`}>
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      }
    >
      <MarketForm market={market} mode="edit" />
    </DashboardShell>
  );
}
