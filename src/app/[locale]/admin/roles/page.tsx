// src/app/[locale]/admin/roles/page.tsx

import { DashboardShell } from "@/components/admin/dashboard-shell";
import { RoleManager } from "@/components/admin/role-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

// Récupère tous les utilisateurs côté serveur
async function getAllUsers() {
  // Note : Le client Supabase doit être créé avec la clé service_role pour cette action
  const supabase = createSupabaseAdminClient();
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return { users: [], error: error.message };
  }
  return { users, error: null };
}

export default async function AdminRolesPage() {
  // Le middleware protège déjà cette route, mais une double vérification est une bonne pratique.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.role !== "admin") {
    redirect("/");
  }

  const { users, error } = await getAllUsers();

  return (
    <DashboardShell title="Gestion des Rôles" headerAction={<></>}>
      {error ? (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur d'accès aux données</AlertTitle>
          <AlertDescription>
            Impossible de charger la liste des utilisateurs. Vérifiez les logs du serveur et que la
            clé `service_role` est correctement configurée. <br />
            <code className="text-xs">{error}</code>
          </AlertDescription>
        </Alert>
      ) : (
        <RoleManager initialUsers={users} />
      )}
    </DashboardShell>
  );
}
