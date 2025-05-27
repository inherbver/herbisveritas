"use server";

// src/actions/cartActions.ts

import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AddToCartInputSchema,
  RemoveFromCartInputSchema,
  type RemoveFromCartInput,
  UpdateCartItemQuantityInputSchema,
  type UpdateCartItemQuantityInput,
} from "@/lib/schemas/cartSchemas";

// Importer les helper functions depuis le fichier séparé
import {
  type CartActionResult,
  isSuccessResult,
  createSuccessResult,
  createValidationErrorResult,
  createGeneralErrorResult,
} from "@/lib/cart-helpers";

import type {
  CartData,
  CartItem,
  // ServerCartItem, // Supprimé car inutilisé après refactorisation de la transformation
  ProductDetails,
} from "@/types/cart";

// Fonction utilitaire pour obtenir l'ID utilisateur (réel ou anonyme)
async function getActiveUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  // Utiliser supabase.auth.getUser() pour une meilleure sécurité
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError) {
    // Une erreur s'est produite lors de la tentative de récupération de l'utilisateur.
    // Cela est différent de "aucun utilisateur connecté" (où user serait null et getUserError serait null).
    // Différencier les erreurs de session "normales" des erreurs inattendues
    if (
      getUserError.message.includes("Auth session missing") ||
      getUserError.message.includes("Invalid session") ||
      getUserError.message.includes("User not found")
    ) {
      console.info(
        `Session utilisateur non trouvée ou invalide dans getActiveUserId (attendu après déconnexion ou pour nouvel utilisateur anonyme): ${getUserError.message}`
      );
    } else {
      console.error(
        "Erreur inattendue lors de la tentative de récupération de l'utilisateur avec getUser() dans getActiveUserId:",
        getUserError.message
      );
    }
    // `user` sera `null` si une erreur s'est produite, donc `userId` deviendra `undefined` ci-dessous,
    // ce qui déclenchera la logique de connexion anonyme, maintenant le comportement de repli.
  }

  let userId = user?.id;

  if (!userId) {
    // Logique de connexion anonyme si aucun utilisateur n'est trouvé ou si une erreur s'est produite avec getUser()
    const { data: anonAuthResponse, error: anonError } = await supabase.auth.signInAnonymously();

    if (anonError) {
      console.error("Erreur lors de la connexion anonyme:", anonError.message);
      return null; // Échec critique de la connexion anonyme
    }
    if (!anonAuthResponse?.user) {
      console.error("La connexion anonyme n'a pas retourné d'utilisateur.");
      return null; // Échec critique de la connexion anonyme
    }
    userId = anonAuthResponse.user.id;
  }
  return userId;
}

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  const activeUserId = await getActiveUserId();

  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité."
    );
  }

  const supabase = await createSupabaseServerClient();

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
    const { data: cart, error: queryError } = await supabase
      .from("carts")
      .select(selectQuery)
      .eq("user_id", activeUserId)
      .order("id", { foreignTable: "cart_items", ascending: true })
      .maybeSingle();

    if (queryError) {
      console.error("Erreur lors de la récupération du panier:", queryError.message);
      return createGeneralErrorResult(`Erreur Supabase: ${queryError.message}`);
    }

    if (!cart) {
      return createSuccessResult(null, "Aucun panier actif trouvé.");
    }

    const currentCart = cart!;
    // currentCart here is the raw data from Supabase which has cart_items: ServerCartItem[]
    // The CartData type in types/cart.ts defines the *output* structure of this function.
    const itemsToTransform: RawSupabaseCartItem[] = currentCart.cart_items || [];

    interface RawSupabaseCartItem {
      id: string;
      product_id: string;
      quantity: number;
      products: ProductDetails | ProductDetails[] | null;
    }

    const transformedCartItems: CartItem[] = itemsToTransform
      .map((item: RawSupabaseCartItem): CartItem => {
        const productData =
          Array.isArray(item.products) && item.products.length > 0
            ? item.products[0]
            : !Array.isArray(item.products) && item.products
              ? item.products
              : null;

        // Handle cases where productData might be null (e.g., product deleted but still in cart_items)
        if (!productData) {
          // This case should ideally be cleaned up by a batch job or handled more gracefully.
          // For now, we'll filter it out or return a minimal representation.
          // Let's log an error and return a structure that can be filtered or identified.
          console.error(
            `Product data missing for cart item ID: ${item.id}, product ID: ${item.product_id}`
          );
          // Returning an object that can be filtered out later if needed, or fill with placeholders.
          // For this example, let's assume we want to create a valid CartItem with placeholder/error values.
          return {
            id: item.id, // Corrected: This is the cart_items.id
            productId: item.product_id,
            name: "Produit indisponible",
            quantity: item.quantity,
            price: 0, // Or some other indicator
            image: undefined, // Corrected to 'image'
            slug: undefined,
          };
        }

        return {
          id: item.id, // Corrected: This is the cart_items.id
          productId: item.product_id,
          quantity: item.quantity,
          name: productData.name,
          price: productData.price,
          image: productData.image_url, // Corrected to 'image'
          slug: productData.slug,
        };
      })
      .filter(Boolean); // Add filter(Boolean) in case map returns null/undefined for some items, though current logic doesn't.

    const finalCartData: CartData = {
      id: currentCart.id,
      user_id: currentCart.user_id,
      created_at: currentCart.created_at,
      updated_at: currentCart.updated_at,
      items: transformedCartItems,
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

  const validatedFields = AddToCartInputSchema.safeParse({ productId, quantity });
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }

  const { productId: validProductId, quantity: quantityToAdd } = validatedFields.data;

  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité pour ajouter au panier."
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
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
      const { data: newCart, error: newCartError } = await supabase
        .from("carts")
        .insert({ user_id: activeUserId })
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

    const { error: rpcError } = await supabase.rpc("add_or_update_cart_item", {
      p_cart_id: cartId,
      p_product_id: validProductId,
      p_quantity_to_add: quantityToAdd,
      p_user_id: activeUserId,
      p_guest_id: null,
    });

    if (rpcError) {
      console.error("Error calling add_or_update_cart_item RPC:", rpcError);
      return createGeneralErrorResult(`Erreur lors de l'ajout de l'article: ${rpcError.message}`);
    }

    revalidateTag("cart");

    const cartStateAfterRpc = await getCart();

    if (!isSuccessResult(cartStateAfterRpc)) {
      let technicalDetail = "Détail de l'erreur de getCart non disponible.";
      if (cartStateAfterRpc.success === false && "error" in cartStateAfterRpc) {
        technicalDetail = cartStateAfterRpc.error;
      } else if (cartStateAfterRpc.success === false && "errors" in cartStateAfterRpc) {
        technicalDetail = `Erreurs de validation du panier: ${JSON.stringify(cartStateAfterRpc.errors)}`;
      }

      const userMessage = `Article ajouté/mis à jour avec succès, mais la récupération de l'état du panier a échoué: ${cartStateAfterRpc.message || "Erreur inconnue lors de la récupération du panier."}`;
      console.warn(`${userMessage} Détails techniques: ${technicalDetail}`);
      return createGeneralErrorResult(technicalDetail, userMessage);
    }

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
  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité pour supprimer l'article."
    );
  }

  try {
    const { data: itemData, error: fetchItemError } = await supabase
      .from("cart_items")
      .select("id, carts (user_id)")
      .eq("id", cartItemId)
      .maybeSingle();

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

    const cartStateAfterRemove = await getCart();

    if (!isSuccessResult(cartStateAfterRemove)) {
      let technicalDetail = "Détail de l'erreur de getCart non disponible.";
      if (cartStateAfterRemove.success === false && "error" in cartStateAfterRemove) {
        technicalDetail = cartStateAfterRemove.error;
      } else if (cartStateAfterRemove.success === false && "errors" in cartStateAfterRemove) {
        technicalDetail = `Erreurs de validation du panier: ${JSON.stringify(cartStateAfterRemove.errors)}`;
      }

      const userMessage = `Article supprimé avec succès, mais la récupération de l'état du panier a échoué: ${cartStateAfterRemove.message || "Erreur inconnue lors de la récupération du panier."}`;
      return createGeneralErrorResult(technicalDetail, userMessage);
    }

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
      return await removeItemFromCart({ cartItemId });
    }

    const { data: itemData, error: fetchItemError } = await supabase
      .from("cart_items")
      .select("id, quantity, carts (user_id)")
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

    const cartStateAfterUpdate = await getCart();

    if (!isSuccessResult(cartStateAfterUpdate)) {
      let technicalDetail = "Détail de l'erreur de getCart non disponible.";
      if (cartStateAfterUpdate.success === false && "error" in cartStateAfterUpdate) {
        technicalDetail = cartStateAfterUpdate.error;
      } else if (cartStateAfterUpdate.success === false && "errors" in cartStateAfterUpdate) {
        technicalDetail = `Erreurs de validation du panier: ${JSON.stringify(cartStateAfterUpdate.errors)}`;
      }

      const userMessage = `Quantité mise à jour avec succès, mais la récupération de l'état du panier a échoué: ${cartStateAfterUpdate.message || "Erreur inconnue lors de la récupération du panier."}`;
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

export async function clearCartAction(
  // prevState est inclus pour la compatibilité avec useActionState si utilisé,
  // mais il n'est pas utilisé activement dans cette implémentation car l'action est simple.
  _prevState: CartActionResult<CartData | null>
): Promise<CartActionResult<CartData | null>> {
  const activeUserId = await getActiveUserId();

  if (!activeUserId) {
    return createGeneralErrorResult(
      "Impossible d'identifier l'utilisateur ou de créer une session invité pour vider le panier."
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    // 1. Trouver l'ID du panier de l'utilisateur
    const { data: cartData, error: cartError } = await supabase
      .from("carts")
      .select("id") // Seulement besoin de l'ID du panier
      .eq("user_id", activeUserId)
      .maybeSingle(); // Il ne devrait y avoir qu'un seul panier actif par utilisateur

    if (cartError) {
      console.error("Erreur lors de la recherche du panier pour le vider:", cartError.message);
      return createGeneralErrorResult(
        `Erreur Supabase lors de la recherche du panier: ${cartError.message}`
      );
    }

    if (!cartData) {
      // Aucun panier actif trouvé pour cet utilisateur, ce n'est pas une erreur.
      // Le panier est effectivement vide.
      return createSuccessResult(null, "Aucun panier actif à vider.");
    }

    // 2. Supprimer tous les cart_items associés à ce cart_id
    const { error: deleteItemsError } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartData.id); // Utiliser l'ID du panier trouvé

    if (deleteItemsError) {
      console.error(
        "Erreur lors de la suppression des articles du panier:",
        deleteItemsError.message
      );
      return createGeneralErrorResult(
        `Erreur Supabase lors de la suppression des articles: ${deleteItemsError.message}`
      );
    }

    revalidateTag("cart");

    // Retourner un état de panier vide, car tous les articles ont été supprimés.
    // Le panier lui-même (l'enregistrement dans la table 'carts') n'est pas supprimé,
    // seulement son contenu.
    return createSuccessResult(null, "Panier vidé avec succès.");
  } catch (e: unknown) {
    console.error("Error in clearCartAction:", (e as Error).message);
    return createGeneralErrorResult(
      (e as Error).message ||
        "Une erreur inattendue est survenue lors de la tentative de vider le panier."
    );
  }
}
