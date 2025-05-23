"use server";

// src/actions/cartActions.ts

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

// cartActions.ts - NOUVEAUX TYPES ET HELPERS (Phase 2)
import type {
  CartData as ClientCartData,
  CartItem as ClientCartItem,
  CartData,
  ServerCartItem,
  ProductDetails,
} from "@/types/cart"; // Pour transformServerCartToClientItems

// Union discriminée stricte pour CartActionResult
type SuccessResult<T> = {
  success: true;
  message?: string;
  data: T; // Toujours présent en cas de succès
};

type ValidationErrorResult = {
  success: false;
  message?: string; // Message général pour l'utilisateur
  errors: Record<string, string[] | undefined>; // Erreurs de validation Zod spécifiques aux champs
};

type GeneralErrorResult = {
  success: false;
  message?: string; // Message général pour l'utilisateur
  error: string; // Erreur générale technique ou code d'erreur
};

export type CartActionResult<T> = SuccessResult<T> | ValidationErrorResult | GeneralErrorResult;

// Type guards pour une utilisation TypeScript-safe
export const isSuccessResult = <T>(result: CartActionResult<T>): result is SuccessResult<T> => {
  return result.success === true;
};

export const isValidationError = <T>(
  result: CartActionResult<T>
): result is ValidationErrorResult => {
  // Vérifie la présence de 'errors' car c'est le discriminateur clé pour ce type d'erreur
  return result.success === false && Object.prototype.hasOwnProperty.call(result, "errors");
};

export const isGeneralError = <T>(result: CartActionResult<T>): result is GeneralErrorResult => {
  // Vérifie la présence de 'error' et l'absence de 'errors' pour distinguer de ValidationErrorResult
  return (
    result.success === false &&
    Object.prototype.hasOwnProperty.call(result, "error") &&
    !Object.prototype.hasOwnProperty.call(result, "errors")
  );
};

// Fonctions utilitaires pour créer les résultats
export const createSuccessResult = <T>(data: T, message?: string): SuccessResult<T> => ({
  success: true,
  data,
  message,
});

export const createValidationErrorResult = (
  errors: Record<string, string[] | undefined>, // Accepte undefined dans le Record
  message?: string
): ValidationErrorResult => ({
  success: false,
  errors,
  message,
});

export const createGeneralErrorResult = (error: string, message?: string): GeneralErrorResult => ({
  success: false,
  error,
  message,
});

// Fonction pour transformer CartData (structure serveur) en CartItem[] (structure client)
// Note: ServerCartItem et ProductDetails sont définis dans src/types/cart.ts
// et CartData (la structure serveur complète) est aussi définie là-bas.
export const transformServerCartToClientItems = (cartData: ClientCartData): ClientCartItem[] => {
  if (!cartData || !cartData.cart_items) {
    return [];
  }
  return cartData.cart_items.map((serverItem) => ({
    id: serverItem.id, // cart_item_id
    productId: serverItem.product_id,
    name: serverItem.products?.name || "Produit inconnu", // Accès direct si 'products' est un objet
    price: serverItem.products?.price || 0,
    quantity: serverItem.quantity,
    image: serverItem.products?.image_url || undefined,
    slug: serverItem.products?.slug || undefined,
  }));
};

// Les anciennes interfaces Product, CartItem (serveur), CartData (serveur)
// et CartActionResult (ancienne version) ont été supprimées.
// Les fonctions existantes (getCart, addItemToCart, etc.) devront être adaptées
// pour utiliser ces nouveaux types et fonctions utilitaires.

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  const activeUserId = await getActiveUserId();

  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité."
    );
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
      console.error("Erreur lors de la récupération du panier:", queryError.message);
      return createGeneralErrorResult(`Erreur Supabase: ${queryError.message}`);
    }

    // Vérification explicite et gestion de tous les cas
    if (!cart) {
      return createSuccessResult(null, "Aucun panier actif trouvé.");
    }

    // À ce point, cart est définitivement non-null
    // Utilisation d'une assertion non-null pour être explicite avec TypeScript
    const currentCart = cart!;

    // Transformation des items du panier
    const itemsToTransform = currentCart.cart_items || [];

    // Define the type for items directly from Supabase before transformation
    interface RawSupabaseCartItem {
      id: string;
      product_id: string;
      quantity: number;
      products: ProductDetails | ProductDetails[] | null; // Reflects Supabase's potential output for joined 'products'
    }

    const transformedCartItems = itemsToTransform.map(
      (item: RawSupabaseCartItem): ServerCartItem => {
        // Logique de transformation de item.products
        const productData =
          Array.isArray(item.products) && item.products.length > 0
            ? item.products[0]
            : !Array.isArray(item.products) && item.products
              ? item.products
              : null;
        return {
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          products: productData as ProductDetails | null,
        };
      }
    );

    // Construction de l'objet CartData final
    const finalCartData: CartData = {
      id: currentCart.id,
      user_id: currentCart.user_id,
      created_at: currentCart.created_at,
      updated_at: currentCart.updated_at,
      cart_items: transformedCartItems,
    };

    return createSuccessResult(finalCartData, "Panier récupéré avec succès.");
  } catch (e: unknown) {
    console.error("Erreur inattendue dans getCart:", (e as Error).message);
    return createGeneralErrorResult(
      (e as Error).message || "Une erreur serveur inattendue est survenue."
    );
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
    return createGeneralErrorResult(
      "Product ID and quantity are required in form data.",
      "Données du formulaire invalides."
    );
  }

  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity)) {
    return createGeneralErrorResult(
      "Invalid quantity format in form data.",
      "Format de quantité invalide."
    );
  }

  // Validation avec Zod
  const validatedFields = AddToCartInputSchema.safeParse({ productId, quantity });
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }
  // Utiliser les données validées par Zod
  const { productId: validProductId, quantity: quantityToAdd } = validatedFields.data;

  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité pour ajouter au panier."
    );
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
      return createGeneralErrorResult(
        `Erreur lors de la recherche du panier: ${cartError.message}`
      );
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
        return createGeneralErrorResult(
          `Erreur lors de la création du panier: ${newCartError.message}`
        );
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
      return createGeneralErrorResult(`Erreur lors de l'ajout de l'article: ${rpcError.message}`);
    }

    revalidateTag("cart");

    const cartStateAfterRpc = await getCart(); // Renamed for clarity

    if (!isSuccessResult(cartStateAfterRpc)) {
      // cartStateAfterRpc is a GeneralErrorResult or ValidationErrorResult from getCart()
      let technicalDetail = "Détail de l'erreur de getCart non disponible.";
      if (cartStateAfterRpc.success === false && "error" in cartStateAfterRpc) {
        // GeneralErrorResult
        technicalDetail = cartStateAfterRpc.error;
      } else if (cartStateAfterRpc.success === false && "errors" in cartStateAfterRpc) {
        // ValidationErrorResult
        technicalDetail = `Erreurs de validation du panier: ${JSON.stringify(cartStateAfterRpc.errors)}`;
      }

      const userMessage = `Article ajouté/mis à jour avec succès, mais la récupération de l'état du panier a échoué: ${cartStateAfterRpc.message || "Erreur inconnue lors de la récupération du panier."}`;
      console.warn(`${userMessage} Détails techniques: ${technicalDetail}`);
      return createGeneralErrorResult(technicalDetail, userMessage);
    }

    // If we reach here, cartStateAfterRpc is SuccessResult<CartData | null>.
    // The original 'updatedCartData' is now cartStateAfterRpc.data.

    return createSuccessResult(cartStateAfterRpc.data, "Article ajouté/mis à jour dans le panier.");
  } catch (error: unknown) {
    console.error("Error in addItemToCart:", (error as Error).message);
    return createGeneralErrorResult(
      (error as Error).message || "Une erreur inattendue est survenue lors de l'ajout au panier."
    );
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
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }
  const { cartItemId } = validatedFields.data;

  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(); // Assurez-vous que activeUserId est défini ici
  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité pour supprimer l'article."
    );
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
        "Erreur lors de la récupération de l'article pour suppression:",
        fetchItemError.message
      );
      return createGeneralErrorResult(`Erreur interne: ${fetchItemError.message}`);
    }

    if (!itemData) {
      return createGeneralErrorResult("Article du panier non trouvé pour la suppression.");
    }

    // @ts-expect-error itemData.carts is expected to be an object if found. Verifying ownership.
    if (!itemData.carts || itemData.carts.user_id !== activeUserId) {
      console.warn(
        "Tentative de suppression d'un article n'appartenant pas à l'utilisateur:",
        cartItemId,
        activeUserId
      );
      return createGeneralErrorResult(
        "Action non autorisée: cet article n'appartient pas à votre panier."
      );
    }

    // 2. Supprimer l'article du panier
    const { error: deleteItemError } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (deleteItemError) {
      console.error("Erreur lors de la suppression de l'article:", deleteItemError.message);
      return createGeneralErrorResult(
        `Erreur lors de la suppression de l'article: ${deleteItemError.message}`
      );
    }

    revalidateTag("cart");

    const cartStateAfterRemove = await getCart(); // Renamed for clarity

    if (!isSuccessResult(cartStateAfterRemove)) {
      // cartStateAfterRemove is a GeneralErrorResult or ValidationErrorResult from getCart()
      let technicalDetail = "Détail de l'erreur de getCart non disponible.";
      if (cartStateAfterRemove.success === false && "error" in cartStateAfterRemove) {
        // GeneralErrorResult
        technicalDetail = cartStateAfterRemove.error;
      } else if (cartStateAfterRemove.success === false && "errors" in cartStateAfterRemove) {
        // ValidationErrorResult
        technicalDetail = `Erreurs de validation du panier: ${JSON.stringify(cartStateAfterRemove.errors)}`;
      }

      const userMessage = `Article supprimé avec succès, mais la récupération de l'état du panier a échoué: ${cartStateAfterRemove.message || "Erreur inconnue lors de la récupération du panier."}`;
      console.warn(`${userMessage} Détails techniques: ${technicalDetail}`);
      return createGeneralErrorResult(technicalDetail, userMessage);
    }

    // If we reach here, cartStateAfterRemove is SuccessResult<CartData | null>.
    // The original 'updatedCartResult' is now cartStateAfterRemove.data.

    return createSuccessResult(cartStateAfterRemove.data, "Article supprimé du panier.");
  } catch (e: unknown) {
    console.error("Error in removeItemFromCart:", (e as Error).message);
    return createGeneralErrorResult(
      (e as Error).message ||
        "Une erreur inattendue est survenue lors de la suppression de l'article."
    );
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
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }
  const { cartItemId, quantity } = validatedFields.data;

  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité pour mettre à jour la quantité."
    );
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
      return createGeneralErrorResult(`Erreur interne: ${fetchItemError.message}`);
    }

    if (!itemData) {
      return createGeneralErrorResult("Article du panier non trouvé pour la mise à jour.");
    }

    // @ts-expect-error itemData.carts is expected to be an object if found, and activeUserId should be defined. Verifying ownership.
    if (!itemData.carts || itemData.carts.user_id !== activeUserId) {
      console.warn(
        "Tentative de mise à jour de quantité d'un article n'appartenant pas à l'utilisateur:",
        cartItemId,
        activeUserId
      );
      return createGeneralErrorResult(
        "Action non autorisée: cet article n'appartient pas à votre panier."
      );
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
      return createGeneralErrorResult(
        `Erreur lors de la mise à jour de la quantité: ${updateItemError.message}`
      );
    }

    revalidateTag("cart");

    const cartStateAfterUpdate = await getCart(); // Renamed for clarity

    if (!isSuccessResult(cartStateAfterUpdate)) {
      // cartStateAfterUpdate is a GeneralErrorResult or ValidationErrorResult from getCart()
      let technicalDetail = "Détail de l'erreur de getCart non disponible.";
      if (cartStateAfterUpdate.success === false && "error" in cartStateAfterUpdate) {
        // GeneralErrorResult
        technicalDetail = cartStateAfterUpdate.error;
      } else if (cartStateAfterUpdate.success === false && "errors" in cartStateAfterUpdate) {
        // ValidationErrorResult
        technicalDetail = `Erreurs de validation du panier: ${JSON.stringify(cartStateAfterUpdate.errors)}`;
      }

      const userMessage = `Quantité mise à jour avec succès, mais la récupération de l'état du panier a échoué: ${cartStateAfterUpdate.message || "Erreur inconnue lors de la récupération du panier."}`;
      console.warn(`${userMessage} Détails techniques: ${technicalDetail}`);
      return createGeneralErrorResult(technicalDetail, userMessage);
    }
    return createSuccessResult(cartStateAfterUpdate.data, "Quantité de l'article mise à jour.");
  } catch (e: unknown) {
    console.error("Error in updateCartItemQuantity:", (e as Error).message);
    return createGeneralErrorResult(
      (e as Error).message ||
        "Une erreur inattendue est survenue lors de la mise à jour de la quantité."
    );
  }
}

// Toutes les actions de base du panier sont maintenant implémentées.
