import { getUsers, getUserStats, type UserPaginationOptions } from "@/actions/userActions";
import { columns } from "@/app/[locale]/admin/users/columns";
import { EnhancedDataTable } from "@/app/[locale]/admin/users/components/enhanced-data-table";
import { UsersStatsCards } from "@/app/[locale]/admin/users/components/users-stats-cards";

interface AdminUsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // Build pagination options from search params
  const paginationOptions: UserPaginationOptions = {
    page: resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1,
    limit: resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit as string) : 25,
    sortBy: (resolvedSearchParams.sortBy as any) || 'created_at',
    sortDirection: (resolvedSearchParams.sortDirection as 'asc' | 'desc') || 'desc',
    search: resolvedSearchParams.search as string || undefined,
    roleFilter: resolvedSearchParams.roleFilter 
      ? Array.isArray(resolvedSearchParams.roleFilter) 
        ? resolvedSearchParams.roleFilter 
        : [resolvedSearchParams.roleFilter]
      : undefined,
    statusFilter: resolvedSearchParams.statusFilter 
      ? Array.isArray(resolvedSearchParams.statusFilter) 
        ? resolvedSearchParams.statusFilter 
        : [resolvedSearchParams.statusFilter]
      : undefined,
  };

  // Fetch both users and stats in parallel
  const [usersResult, statsResult] = await Promise.all([
    getUsers(paginationOptions),
    getUserStats()
  ]);

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

  // Extract the paginated data
  const { data: usersData, pagination } = usersResult.data;
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
              {pagination.total} utilisateur(s) au total - Page {pagination.page} sur {pagination.totalPages}
            </p>
          </div>
        </header>

        <EnhancedDataTable 
          columns={columns} 
          data={usersData} 
          pagination={pagination}
        />
      </section>
    </main>
  );
}
