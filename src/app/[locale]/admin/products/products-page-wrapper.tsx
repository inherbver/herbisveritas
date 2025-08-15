import { getProductsForAdmin } from "@/lib/supabase/queries/products";
import AdminProductsClient from "./admin-products-client";

export default async function ProductsPageWrapper() {
  const result = await getProductsForAdmin();

  return <AdminProductsClient initialProducts={result.data} />;
}
