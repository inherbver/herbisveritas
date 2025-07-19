import { getUsers } from "@/actions/userActions";
import { columns } from "@/app/[locale]/admin/users/columns";
import { DataTable } from "@/app/[locale]/admin/users/data-table";

export default async function AdminUsersPage() {
  const result = await getUsers();

  if (!result.success) {
    return <div className="text-red-500">Error: {result.error}</div>;
  }

  const users = result.data;

  return (
    <section className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">User Management</h1>
      <DataTable columns={columns} data={users} />
    </section>
  );
}
