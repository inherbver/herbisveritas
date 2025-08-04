import { redirect, notFound } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPartnerById } from "@/lib/markets/queries";
import { DashboardShell } from "@/components/admin/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PartnerForm } from "../../partner-form";

interface EditPartnerPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit Partner Page
 * 
 * Page de modification d'un partenaire existant
 */
export default async function EditPartnerPage({ params }: EditPartnerPageProps) {
  const { id } = await params;

  // 1. Check admin permissions
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }
  
  const isAdmin = await checkAdminRole(user.id);
  if (!isAdmin) {
    redirect("/");
  }

  // 2. Fetch partner data
  const partner = await getPartnerById(id);
  
  if (!partner) {
    notFound();
  }

  return (
    <DashboardShell
      title={`Modifier: ${partner.name}`}
      description="Modifier les informations du partenaire"
      headerAction={
        <div className="flex gap-2">
          <Link href={`/admin/partners`}>
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      }
    >
      <PartnerForm partner={partner} mode="edit" />
    </DashboardShell>
  );
}