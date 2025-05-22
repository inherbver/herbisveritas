"use server";

// src/actions/cartActions.ts

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string;
}

export interface CartItem {
  id: string; // This is cart_item_id (UUID)
  product_id: string; // This is the actual product's ID (e.g., prod_cos_003)
  quantity: number;
  products: Product[]; // Adjusted to Product[] based on lint error
}

export interface CartData {
  id: string; // This is cart_id (UUID)
  user_id: string | null; // Associated user_id (can be guest's anon UUID)
  created_at: string;
  updated_at: string;
  cart_items: CartItem[];
}

// Fonction utilitaire pour obtenir l'ID utilisateur (réel ou anonyme)
async function getActiveUserId(): Promise<string | null> {
  // Crée un client Supabase spécifique pour cette fonction afin d'isoler son utilisation des cookies.
  // Important: s'assure que les opérations d'authentification (getSession, signInAnonymously)
  // lisent et écrivent les cookies correctement dans le contexte de cette Server Action.
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "Erreur lors de la récupération de la session dans getActiveUserId:",
      sessionError.message
    );
    // Ne pas retourner null ici, car signInAnonymously pourrait quand même fonctionner ou être pertinent.
  }

  let userId = session?.user?.id;

  if (!userId) {
    console.log("Aucun utilisateur connecté, tentative de connexion anonyme.");
    const { data: anonAuthResponse, error: anonError } = await supabase.auth.signInAnonymously();

    if (anonError) {
      console.error("Erreur lors de la connexion anonyme:", anonError.message);
      return null;
    }
    if (!anonAuthResponse?.user) {
      console.error("Connexion anonyme n'a pas retourné d'utilisateur.");
      return null;
    }
    console.log("Connexion anonyme réussie. ID utilisateur anonyme:", anonAuthResponse.user.id);
    userId = anonAuthResponse.user.id;
    // À ce stade, le client Supabase SSR aura mis à jour les cookies dans la réponse en attente
    // si une nouvelle session anonyme a été créée.
  }
  return userId;
}

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AddToCartInputSchema,
  RemoveFromCartInputSchema,
  type RemoveFromCartInput,
  UpdateCartItemQuantityInputSchema,
  type UpdateCartItemQuantityInput,
} from "@/lib/schemas/cartSchemas";

export interface CartActionResult<SuccessPayload> {
  success: boolean;
  message?: string;
  error?: string;
  data?: SuccessPayload | { errors?: Record<string, string[] | undefined> };
}

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  const activeUserId = await getActiveUserId();

  if (!activeUserId) {
    return {
      success: false,
      error: "Impossible d'identifier l'utilisateur ou de créer une session invité.",
      data: null,
    };
  }

  const supabase = await createSupabaseServerClient(); // Client pour les opérations DB

  const selectQuery = `
    id,
    user_id,
    created_at,
    updated_at,
    cart_items (
      id,
      product_id,
      quantity,
      products (id, name, price, image_url, slug)
    )
  `;

  try {
    // Avec activeUserId (qui peut être un ID d'utilisateur anonyme), on cherche toujours le panier par user_id.
    // La condition .is('guest_id', null) est importante si la table `carts`
    // peut encore contenir d'anciens paniers uniquement liés par `guest_id` que vous ne voulez pas
    // associer à un nouvel utilisateur anonyme qui aurait le même `user_id` qu'un ancien `guest_id` (improbable mais possible).
    // Pour une nouvelle implémentation propre, tous les paniers (invités ou non) sont liés par user_id.
    const { data: cart, error: queryError } = await supabase
      .from("carts")
      .select(selectQuery) // selectQuery est défini plus haut dans le fichier
      .eq("user_id", activeUserId)
      //.is('guest_id', null) // Optionnel: à conserver si vous avez des paniers 'legacy' guest_id uniquement.
      // Pour une implémentation fraîche, guest_id sur la table carts sera toujours null.

      .order("id", { foreignTable: "cart_items", ascending: true })
      .maybeSingle();

    if (queryError) {
      console.error("Error fetching cart:", queryError.message);
      return { success: false, error: queryError.message, data: null };
    }

    return {
      success: true,
      data: cart,
      message: cart ? "Panier récupéré." : "Panier vide ou nouvel utilisateur/invité.",
    };
  } catch (e: unknown) {
    let errorMessage = "Une erreur inattendue est survenue.";
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error("Unexpected error in getCart:", errorMessage);
    return { success: false, error: errorMessage, data: null };
  }
}

export async function addItemToCart(
  prevState: CartActionResult<CartData | null>,
  formData: FormData
): Promise<CartActionResult<CartData | null>> {
  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;

  // Validation initiale des données du formulaire
  if (!productId || !quantityStr) {
    return {
      success: false,
      error: "Product ID and quantity are required in form data.",
      data: null,
    };
  }

  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity)) {
    return {
      success: false,
      error: "Invalid quantity format in form data.",
      data: null,
    };
  }

  // Validation avec Zod
  const validatedFields = AddToCartInputSchema.safeParse({ productId, quantity });
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return {
      success: false,
      error: firstError,
      data: { errors: validatedFields.error.flatten().fieldErrors },
    };
  }
  // Utiliser les données validées par Zod
  const { productId: validProductId, quantity: quantityToAdd } = validatedFields.data;

  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    return {
      success: false,
      error:
        "Impossible d'identifier l'utilisateur ou de créer une session invité pour ajouter un article.",
      data: null,
    };
  }

  const supabase = await createSupabaseServerClient(); // Client pour les opérations DB

  try {
    // 1. Trouver ou créer le panier pour activeUserId
    let cartId: string;
    const { data: existingCart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", activeUserId)
      .maybeSingle();

    if (cartError) {
      console.error(
        "Erreur lors de la recherche du panier existant pour l'utilisateur:",
        activeUserId,
        cartError.message
      );
      return { success: false, error: cartError.message, data: null };
    }

    if (existingCart) {
      cartId = existingCart.id;
    } else {
      // Créer un nouveau panier lié à activeUserId
      const { data: newCart, error: newCartError } = await supabase
        .from("carts")
        .insert({ user_id: activeUserId }) // guest_id n'est pas défini ici
        .select("id")
        .single();

      if (newCartError) {
        console.error(
          "Erreur lors de la création du nouveau panier pour l'utilisateur:",
          activeUserId,
          newCartError.message
        );
        return { success: false, error: newCartError.message, data: null };
      }
      cartId = newCart.id;
    }

    // 2. Appeler la fonction RPC pour ajouter/mettre à jour l'article
    // p_guest_id est maintenant toujours null car l'invité est identifié par son activeUserId (anonyme)
    const { error: rpcError } = await supabase.rpc("add_or_update_cart_item", {
      p_cart_id: cartId,
      p_product_id: validProductId, // Utiliser validProductId
      p_quantity_to_add: quantityToAdd, // Utiliser quantityToAdd,
      p_user_id: activeUserId,
      p_guest_id: null,
    });

    if (rpcError) {
      console.error("Error calling add_or_update_cart_item RPC:", rpcError);
      // Le message d'erreur de la RPC est souvent assez explicite pour l'utilisateur final
      return {
        success: false,
        error: `Erreur lors de l'ajout de l'article: ${rpcError.message}`,
        data: null,
      };
    }

    revalidateTag("cart");

    const { data: updatedCartData, error: fetchError, success: fetchSuccess } = await getCart();
    if (!fetchSuccess || fetchError) {
      console.warn(
        "Article ajouté/mis à jour, mais échec de la récupération du panier à jour:",
        fetchError
      );
      return {
        success: true,
        message: "Article ajouté/mis à jour. Rafraîchissez pour voir les changements.",
        data: null,
      };
    }

    return {
      success: true,
      message: "Article ajouté/mis à jour dans le panier.",
      data: updatedCartData,
    };
  } catch (error: unknown) {
    console.error("Error in addItemToCart:", (error as Error).message);
    return {
      success: false,
      error:
        (error as Error).message || "Une erreur inattendue est survenue lors de l'ajout au panier.",
      data: null,
    };
  }
}

export async function removeItemFromCart(
  input: RemoveFromCartInput
): Promise<CartActionResult<CartData | null>> {
  const validatedFields = RemoveFromCartInputSchema.safeParse(input);
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return {
      success: false,
      error: firstError,
      data: { errors: validatedFields.error.flatten().fieldErrors },
    };
  }
  const { cartItemId } = validatedFields.data;

  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(); // Assurez-vous que activeUserId est défini ici
  if (!activeUserId) {
    return {
      success: false,
      error:
        "Impossible d'identifier l'utilisateur ou de créer une session invité pour supprimer un article.",
    };
  }

  try {
    // 1. Vérifier que l'article appartient bien au panier de l'utilisateur actif
    const { data: itemData, error: fetchItemError } = await supabase
      .from("cart_items")
      .select("id, carts (user_id)") // Récupérer l'id de l'utilisateur du panier parent
      .eq("id", cartItemId)
      .maybeSingle(); // Utiliser maybeSingle pour ne pas avoir d'erreur si l'item n'est pas trouvé

    if (fetchItemError) {
      console.error(
        "Erreur lors de la récupération de l'article du panier pour suppression:",
        fetchItemError.message
      );
      return { success: false, error: `Erreur interne: ${fetchItemError.message}` };
    }

    if (!itemData) {
      return { success: false, error: "Article du panier non trouvé." };
    }

    // @ts-expect-error itemData.carts is expected to be an object if found. Verifying ownership.
    if (!itemData.carts || itemData.carts.user_id !== activeUserId) {
      console.warn(
        "Tentative de suppression d'un article n'appartenant pas à l'utilisateur:",
        cartItemId,
        activeUserId
      );
      return {
        success: false,
        error: "Action non autorisée: cet article n'appartient pas à votre panier.",
      };
    }

    // 2. Supprimer l'article du panier
    const { error: deleteItemError } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (deleteItemError) {
      console.error("Error deleting cart item:", deleteItemError.message);
      throw new Error(
        `Erreur lors de la suppression de l'article du panier: ${deleteItemError.message}`
      );
    }

    revalidateTag("cart");

    const {
      data: updatedCartResult,
      error: fetchCartError,
      success: fetchSuccess,
    } = await getCart();
    if (!fetchSuccess || fetchCartError) {
      console.warn(
        "Article supprimé, mais échec de la récupération du panier à jour:",
        fetchCartError
      );
      return {
        success: true,
        message: "Article supprimé. Rafraîchissez pour voir les changements.",
        data: null,
      };
    }

    return { success: true, message: "Article supprimé du panier.", data: updatedCartResult };
  } catch (e: unknown) {
    console.error("Error in removeItemFromCart:", (e as Error).message);
    return {
      success: false,
      error:
        (e as Error).message ||
        "Une erreur inattendue est survenue lors de la suppression de l'article.",
      data: null,
    };
  }
}

export async function updateCartItemQuantity(
  input: UpdateCartItemQuantityInput
): Promise<CartActionResult<CartData | null>> {
  const validatedFields = UpdateCartItemQuantityInputSchema.safeParse(input);
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return {
      success: false,
      error: firstError,
      data: { errors: validatedFields.error.flatten().fieldErrors },
    };
  }
  const { cartItemId, quantity } = validatedFields.data;

  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    return {
      success: false,
      error:
        "Impossible d'identifier l'utilisateur ou de créer une session invité pour mettre à jour la quantité.",
    };
  }

  const supabase = await createSupabaseServerClient();

  try {
    if (quantity <= 0) {
      // Si la quantité est 0 ou moins, nous devrions plutôt supprimer l'article.
      console.log(`La quantité pour l'article ${cartItemId} est <= 0, tentative de suppression.`);
      return await removeItemFromCart({ cartItemId });
    }

    // 1. Vérifier que l'article appartient bien au panier de l'utilisateur actif
    const { data: itemData, error: fetchItemError } = await supabase
      .from("cart_items")
      .select("id, quantity, carts (user_id)") // Récupérer l'id de l'utilisateur du panier parent
      .eq("id", cartItemId)
      .maybeSingle();

    if (fetchItemError) {
      console.error(
        "Erreur lors de la récupération de l'article pour mise à jour de quantité:",
        fetchItemError.message
      );
      return { success: false, error: `Erreur interne: ${fetchItemError.message}` };
    }

    if (!itemData) {
      return { success: false, error: "Article du panier non trouvé pour la mise à jour." };
    }

    // @ts-expect-error itemData.carts is expected to be an object if found, and activeUserId should be defined. Verifying ownership.
    if (!itemData.carts || itemData.carts.user_id !== activeUserId) {
      console.warn(
        "Tentative de mise à jour de quantité d'un article n'appartenant pas à l'utilisateur:",
        cartItemId,
        activeUserId
      );
      return {
        success: false,
        error: "Action non autorisée: cet article n'appartient pas à votre panier.",
      };
    }

    // 2. Mettre à jour la quantité de l'article
    const { error: updateItemError } = await supabase
      .from("cart_items")
      .update({ quantity: quantity, updated_at: new Date().toISOString() })
      .eq("id", cartItemId);

    if (updateItemError) {
      console.error(
        "Erreur lors de la mise à jour de la quantité de l'article:",
        updateItemError.message
      );
      return {
        success: false,
        error: `Erreur lors de la mise à jour de la quantité: ${updateItemError.message}`,
      };
    }

    revalidateTag("cart");

    const {
      data: updatedCartResult,
      error: fetchCartError,
      success: fetchSuccess,
    } = await getCart();
    if (!fetchSuccess || fetchCartError) {
      console.warn(
        "Quantité mise à jour/article supprimé, mais échec de la récupération du panier à jour:",
        fetchCartError
      );
      return {
        success: true,
        message: "Opération sur l'article réussie. Rafraîchissez pour voir les changements.",
        data: null,
      };
    }

    return {
      success: true,
      message: "Quantité de l'article mise à jour.",
      data: updatedCartResult,
    };
  } catch (e: unknown) {
    console.error("Error in updateCartItemQuantity:", (e as Error).message);
    return {
      success: false,
      error:
        (e as Error).message ||
        "Une erreur inattendue est survenue lors de la mise à jour de la quantité.",
      data: null,
    };
  }
}

// Toutes les actions de base du panier sont maintenant implémentées.
