import { getTranslations } from "next-intl/server";
import { ProductForm } from "../../new/product-form";
import { getProductByIdForAdmin } from "@/lib/supabase/queries/products";

interface EditProductPageProps {
  params: Promise<{ locale: string; id: string }>; // ✅ Promisifié
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  // ✅ Await params avant utilisation
  const { id } = await params;
  const t = await getTranslations("AdminProducts");
  const product = await getProductByIdForAdmin(id);

  if (!product) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-destructive">{t("productNotFound")}</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">{t("editProductTitle")}</h1>
      <ProductForm initialData={product} />
    </div>
  );
}
