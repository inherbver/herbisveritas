import { createSupabaseServerClient } from "@/lib/supabase/server";
// import { AppPathname } from '@/i18n/navigation'; // Importer si nécessaire pour typer le slug

// Définir le type de retour pour plus de clarté
export interface FeaturedHeroItem {
  productName: string;
  productSlug: string; // Ou AppPathname si vous voulez une validation plus stricte
  productImageUrl: string | null; // Peut être null si l'image n'est pas définie
  customSubtitle: string;
}

export async function getActiveFeaturedHeroItem(): Promise<FeaturedHeroItem | null> {
// locale: string // Décommenter si le slug doit être dépendant de la locale et géré ici
  try {
    const supabase = await createSupabaseServerClient(); // Instantiate the server client
    const { data: featuredItem, error: featuredItemError } = await supabase
      .from("featured_hero_items")
      .select(
        `
        custom_subtitle,
        products (
          name,
          slug,
          image_url
        )
      `
      )
      .eq("is_active", true)
      .limit(1) // S'assurer qu'on ne prend qu'un seul item actif
      .single(); // single() est utile si on s'attend à un seul ou aucun résultat

    if (featuredItemError) {
      if (featuredItemError.code === "PGRST116") {
        // 'PGRST116' signifie que .single() n'a trouvé aucune ligne, ce qui est normal s'il n'y a pas de hero actif.
        console.log("No active featured hero item found.");
        return null;
      }
      console.error("Error fetching active featured hero item:", featuredItemError);
      throw featuredItemError; // Ou retourner null selon la stratégie de gestion d'erreur
    }

    if (!featuredItem || !featuredItem.products) {
      console.log("Featured item or product data is missing.");
      return null;
    }

    // Adapter la structure des données retournées si 'products' est un objet et non un tableau
    // D'après la query, 'products' sera un objet car on fait une jointure depuis featured_hero_items (un) vers products (un).
    const productData = Array.isArray(featuredItem.products)
      ? featuredItem.products[0]
      : featuredItem.products;

    if (!productData) {
      console.log("Product data is missing in the featured item.");
      return null;
    }

    // Vérification de sécurité pour les champs obligatoires du produit
    if (!productData.name || !productData.slug) {
      console.error("Featured product is missing name or slug.");
      return null;
    }

    return {
      productName: productData.name,
      productSlug: productData.slug,
      productImageUrl: productData.image_url,
      customSubtitle: featuredItem.custom_subtitle,
    };
  } catch (error) {
    console.error("Unexpected error in getActiveFeaturedHeroItem:", error);
    // En fonction de la criticité, vous pourriez vouloir propager l'erreur ou retourner null
    // throw error;
    return null;
  }
}
