import { DashboardShell } from "@/components/admin/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { getProductsForAdmin } from "@/lib/supabase/queries/products";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default async function AdminProductsPage() {
  const products = await getProductsForAdmin();

  return (
    <DashboardShell
      title="Gestion des Produits"
      headerAction={
        <Link href="/admin/products/new">
          <Button>Ajouter un produit</Button>
        </Link>
      }
    >
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous les produits</TabsTrigger>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="draft">Brouillons</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Liste des produits</CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Implement DataTable here */}
              <DataTable columns={columns} data={products} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
