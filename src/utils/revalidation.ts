import { revalidatePath } from "next/cache";

interface RevalidateProductOptions {
    productId?: string;
    slug?: string;
    action: 'create' | 'update' | 'delete' | 'updateStatus';
}

export function revalidateProductPages({ productId, slug, action }: RevalidateProductOptions) {
    // 1. Revalider la liste des produits dans l'admin pour toutes les locales.
    // L'option 'layout' est la plus efficace pour les routes dynamiques comme /[locale].
    revalidatePath("/admin/products", "layout");
    
    // 2. Revalider la page boutique principale pour toutes les locales.
    revalidatePath("/[locale]/shop", "page");
    
    // 3. Revalider les pages spécifiques au produit si un slug est fourni.
    if (slug) {
        revalidatePath(`/[locale]/products/${slug}`, "page");
    }
    
    // 4. Revalider la page d'édition en cas de mise à jour.
    if (action === 'update' && productId) {
        revalidatePath(`/[locale]/admin/products/${productId}/edit`, "page");
    }
}
