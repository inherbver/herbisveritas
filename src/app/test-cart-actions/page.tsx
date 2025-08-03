"use client";

import { useEffect, useActionState, useTransition, useState } from "react";
import {
  addItemToCart,
  clearCartAction,
  getCart,
  removeItemFromCartFormAction,
  updateCartItemQuantityFormAction,
} from "@/actions/cart.actions";
import {
  INITIAL_ACTION_STATE_DO_NOT_PROCESS,
  isGeneralErrorResult,
  isSuccessResult,
  isValidationErrorResult,
  type CartActionResult,
} from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";

export default function TestCartActionsPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [isFetchingCart, startFetchingCart] = useTransition();

  // --- Action States ---
  const [addItemState, addItemSubmit, isAddingItem] = useActionState(
    addItemToCart,
    INITIAL_ACTION_STATE_DO_NOT_PROCESS
  );
  const [removeItemState, removeItemSubmit, isRemovingItem] = useActionState(
    removeItemFromCartFormAction,
    INITIAL_ACTION_STATE_DO_NOT_PROCESS
  );
  const [updateItemState, updateItemSubmit, isUpdatingItem] = useActionState(
    updateCartItemQuantityFormAction,
    INITIAL_ACTION_STATE_DO_NOT_PROCESS
  );
  const [clearCartState, clearCartSubmit, isClearingCart] = useActionState(
    clearCartAction,
    INITIAL_ACTION_STATE_DO_NOT_PROCESS
  );

  const handleGetCart = () => {
    startFetchingCart(async () => {
      const result = await getCart();
      if (isSuccessResult(result)) {
        setCart(result.data);
      } else {
        console.error("Failed to fetch cart:", result.message);
        setCart(null);
      }
    });
  };

  // Effect to fetch initial cart
  useEffect(() => {
    handleGetCart();
  }, []);

  // Effect to update cart state on successful actions
  useEffect(() => {
    const results = [addItemState, removeItemState, updateItemState, clearCartState];
    for (const result of results) {
      if (isSuccessResult(result)) {
        setCart(result.data);
      }
    }
  }, [addItemState, removeItemState, updateItemState, clearCartState]);

  const isLoading =
    isFetchingCart || isAddingItem || isRemovingItem || isUpdatingItem || isClearingCart;

  const styles: { [key: string]: React.CSSProperties } = {
    container: { fontFamily: "sans-serif", padding: "20px", maxWidth: "800px", margin: "0 auto" },
    section: {
      marginBottom: "30px",
      padding: "20px",
      border: "1px solid #ccc",
      borderRadius: "4px",
    },
    title: { marginTop: 0, borderBottom: "2px solid #eee", paddingBottom: "10px" },
    button: { marginRight: "10px", padding: "8px 12px", cursor: "pointer" },
    input: { margin: "5px 0 10px", padding: "8px", width: "calc(100% - 20px)" },
    pre: {
      backgroundColor: "#f5f5f5",
      padding: "15px",
      borderRadius: "4px",
      overflowX: "auto" as const,
    },
    error: { color: "red", fontWeight: "bold" },
    success: { color: "green", fontWeight: "bold" },
    loading: { fontStyle: "italic" },
  };

  const renderActionResult = (title: string, result: CartActionResult<CartData | null>) => {
    if (result.success === undefined) return null; // Don't render initial state

    return (
      <div style={styles.section}>
        <h2 style={styles.title}>{title}</h2>
        {isSuccessResult(result) && <p style={styles.success}>Succès: {result.message}</p>}
        {isGeneralErrorResult(result) && <p style={styles.error}>Erreur: {result.message}</p>}
        {isValidationErrorResult(result) && (
          <div>
            <p style={styles.error}>Erreur de validation: {result.message}</p>
            <pre style={styles.pre}>{JSON.stringify(result.errors, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h1>Test des Actions du Panier</h1>
      {isLoading && <p style={styles.loading}>Chargement...</p>}

      {renderActionResult("Résultat Ajout", addItemState)}
      {renderActionResult("Résultat Suppression", removeItemState)}
      {renderActionResult("Résultat Mise à jour", updateItemState)}
      {renderActionResult("Résultat Vider Panier", clearCartState)}

      <div style={styles.section}>
        <h2 style={styles.title}>Panier Actuel :</h2>
        <button style={styles.button} onClick={handleGetCart} disabled={isLoading}>
          Rafraîchir
        </button>
        <form action={clearCartSubmit} style={{ display: "inline" }}>
          <button type="submit" style={styles.button} disabled={isLoading}>
            Vider le Panier
          </button>
        </form>
        {cart ? <pre style={styles.pre}>{JSON.stringify(cart, null, 2)}</pre> : <p>Panier vide.</p>}
      </div>

      <form action={addItemSubmit} style={styles.section}>
        <h2 style={styles.title}>Ajouter un Article</h2>
        <label>ID du produit:</label>
        <input type="text" name="productId" defaultValue="prod_cos_003" style={styles.input} />
        <label>Quantité:</label>
        <input type="number" name="quantity" defaultValue={1} style={styles.input} />
        <button type="submit" style={styles.button} disabled={isLoading}>
          Ajouter
        </button>
      </form>

      <form action={removeItemSubmit} style={styles.section}>
        <h2 style={styles.title}>Supprimer un Article</h2>
        <label>ID de l'article à supprimer:</label>
        <input
          type="text"
          name="cartItemId"
          placeholder="ID de l'article à supprimer"
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={isLoading}>
          Supprimer
        </button>
      </form>

      <form action={updateItemSubmit} style={styles.section}>
        <h2 style={styles.title}>Mettre à Jour la Quantité</h2>
        <label>ID de l'article à mettre à jour:</label>
        <input
          type="text"
          name="cartItemId"
          placeholder="ID de l'article à màj"
          required
          style={styles.input}
        />
        <label>Nouvelle quantité:</label>
        <input type="number" name="quantity" defaultValue={2} min={1} style={styles.input} />
        <button type="submit" style={styles.button} disabled={isLoading}>
          Mettre à jour
        </button>
      </form>
    </div>
  );
}
