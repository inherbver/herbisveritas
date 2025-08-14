import { getUsers, getUserStats } from "@/actions/userActions";
import { columns } from "@/app/[locale]/admin/users/columns";
import { EnhancedDataTable } from "@/app/[locale]/admin/users/components/enhanced-data-table";
import { UsersStatsCards } from "@/app/[locale]/admin/users/components/users-stats-cards";

export default async function AdminUsersPage() {
  // Fetch both users and stats in parallel
  const [usersResult, statsResult] = await Promise.all([getUsers(), getUserStats()]);

  if (!usersResult.success || !usersResult.data) {
    return (
      <main className="container mx-auto py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les comptes utilisateur, rôles et permissions
          </p>
        </header>
        <div className="flex h-32 items-center justify-center text-destructive">
          Erreur lors du chargement des données utilisateur
        </div>
      </main>
    );
  }

  // Extract the nested data from the permission wrapper
  const usersData = usersResult.data.success && usersResult.data.data ? usersResult.data.data : [];
  const statsData =
    statsResult.success && statsResult.data && statsResult.data.success
      ? statsResult.data.data
      : null;

  return (
    <main className="container mx-auto space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérez les comptes utilisateur, rôles et permissions de votre plateforme
        </p>
      </header>

      {/* Dashboard statistiques */}
      {statsData && <UsersStatsCards stats={statsData} isLoading={!statsResult.success} />}

      {/* Table des utilisateurs avec filtres avancés */}
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Liste des utilisateurs</h2>
            <p className="text-sm text-muted-foreground">
              {usersData.length} utilisateur(s) au total
            </p>
          </div>
        </header>

        <EnhancedDataTable columns={columns} data={usersData} />
      </section>
    </main>
  );
}
