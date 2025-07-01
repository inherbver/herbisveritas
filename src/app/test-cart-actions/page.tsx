"use client";

import { useState, useEffect } from "react";
import {
  getCart,
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  type CartActionResult,
  type CartData, // Import CartData type
} from "@/actions/cartActions";
import {
  type AddToCartInput,
  type RemoveFromCartInput,
  type UpdateCartItemQuantityInput,
} from "@/lib/validators/cart.validator";

export default function TestCartActionsPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [actionResult, setActionResult] = useState<CartActionResult<CartData | null> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inputs for addItemToCart
  const [productIdToAdd, setProductIdToAdd] = useState<string>("prod_cos_003"); // Defaulting to your product
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);

  // Inputs for removeItemFromCart
  const [cartItemIdToRemove, setCartItemIdToRemove] = useState<string>("");

  // Inputs for updateCartItemQuantity
  const [cartItemIdToUpdate, setCartItemIdToUpdate] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<number>(1);

  const handleGetCart = async () => {
    setIsLoading(true);
    setActionResult(null);
    const result = await getCart();
    setActionResult(result);
    if (result.success && result.data && !("errors" in result.data)) {
      setCart(result.data as CartData | null); // Type assertion after check
    } else if (!result.success && result.data && "errors" in result.data) {
      // Handle validation errors, maybe clear cart or show specific UI
      console.log("Validation errors, cart not updated from this action.");
    } else if (result.success && result.data === null) {
      setCart(null); // Explicitly set to null if data is null on success
    }
    setIsLoading(false);
  };

  const handleAddItemToCart = async () => {
    setIsLoading(true);
    setActionResult(null);
    const input: AddToCartInput = { productId: productIdToAdd, quantity: quantityToAdd };
    const result = await addItemToCart(input);
    setActionResult(result);
    if (result.success && result.data && !("errors" in result.data)) {
      setCart(result.data as CartData | null);
    } else if (!result.success && result.data && "errors" in result.data) {
      console.log("Validation errors, cart not updated from addItemToCart.");
    } else if (result.success && result.data === null) {
      setCart(null);
    }
    setIsLoading(false);
  };

  const handleRemoveItemFromCart = async () => {
    if (!cartItemIdToRemove) {
      setActionResult({
        success: false,
        error: "L'ID de l'article du panier à supprimer est requis.",
      });
      return;
    }
    setIsLoading(true);
    setActionResult(null);
    const input: RemoveFromCartInput = { cartItemId: cartItemIdToRemove };
    const result = await removeItemFromCart(input);
    setActionResult(result);
    if (result.success && result.data && !("errors" in result.data)) {
      setCart(result.data as CartData | null);
    } else if (!result.success && result.data && "errors" in result.data) {
      console.log("Validation errors, cart not updated from removeItemFromCart.");
    } else if (result.success && result.data === null) {
      // If remove results in empty cart represented by null
      setCart(null);
    } else if (result.success && Array.isArray(result.data) && result.data.length === 0) {
      // If remove results in empty cart_items array
      setCart((prevCart) => (prevCart ? { ...prevCart, cart_items: [] } : null));
    }
    setIsLoading(false);
  };

  const handleUpdateCartItemQuantity = async () => {
    if (!cartItemIdToUpdate) {
      setActionResult({
        success: false,
        error: "L'ID de l'article du panier à mettre à jour est requis.",
      });
      return;
    }
    setIsLoading(true);
    setActionResult(null);
    const input: UpdateCartItemQuantityInput = {
      cartItemId: cartItemIdToUpdate,
      quantity: newQuantity,
    };
    const result = await updateCartItemQuantity(input);
    setActionResult(result);
    if (result.success && result.data && !("errors" in result.data)) {
      setCart(result.data as CartData | null);
    } else if (!result.success && result.data && "errors" in result.data) {
      console.log("Validation errors, cart not updated from updateCartItemQuantity.");
    } else if (result.success && result.data === null) {
      setCart(null);
    }
    setIsLoading(false);
  };

  // Automatically fetch cart on page load
  useEffect(() => {
    handleGetCart();
  }, []);

  const styles = {
    container: {
      fontFamily: "Arial, sans-serif",
      margin: "20px",
      padding: "20px",
      border: "1px solid #ccc",
      borderRadius: "8px",
    },
    section: { marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #eee" },
    title: { fontSize: "20px", fontWeight: "bold", marginBottom: "10px" },
    button: {
      padding: "10px 15px",
      margin: "5px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    },
    input: {
      padding: "8px",
      margin: "5px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      width: "200px",
    },
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

  return (
    <div style={styles.container}>
      <h1>Test des Actions du Panier</h1>

      {isLoading && <p style={styles.loading}>Chargement...</p>}

      {actionResult && (
        <div style={styles.section}>
          <h2 style={styles.title}>Dernier Résultat d'Action :</h2>
          {actionResult.success ? (
            <p style={styles.success}>Succès: {actionResult.message || "Opération réussie."}</p>
          ) : (
            <p style={styles.error}>
              Erreur: {actionResult.error || actionResult.message || "Une erreur est survenue."}
            </p>
          )}
          {actionResult.data && "errors" in actionResult.data && actionResult.data.errors && (
            <div>
              <p style={styles.error}>Erreurs de validation :</p>
              <pre style={styles.pre}>
                {JSON.stringify(
                  (actionResult.data as { errors: Record<string, string[] | undefined> }).errors,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.title}>Panier Actuel :</h2>
        <button style={styles.button} onClick={handleGetCart} disabled={isLoading}>
          Rafraîchir le Panier
        </button>
        {cart ? (
          <pre style={styles.pre}>{JSON.stringify(cart, null, 2)}</pre>
        ) : (
          <p>Aucun panier à afficher ou panier vide.</p>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.title}>Ajouter un Article au Panier</h2>
        <div>
          <label>ID du Produit: </label>
          <input
            style={styles.input}
            type="text"
            value={productIdToAdd}
            onChange={(e) => setProductIdToAdd(e.target.value)}
          />
        </div>
        <div>
          <label>Quantité: </label>
          <input
            style={styles.input}
            type="number"
            value={quantityToAdd}
            onChange={(e) => setQuantityToAdd(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <button style={styles.button} onClick={handleAddItemToCart} disabled={isLoading}>
          Ajouter au Panier
        </button>
      </div>

      <div style={styles.section}>
        <h2 style={styles.title}>Supprimer un Article du Panier</h2>
        <div>
          <label>ID de l'Article du Panier: </label>
          <input
            style={styles.input}
            type="text"
            value={cartItemIdToRemove}
            onChange={(e) => setCartItemIdToRemove(e.target.value)}
            placeholder="UUID de l'article du panier"
          />
        </div>
        <button style={styles.button} onClick={handleRemoveItemFromCart} disabled={isLoading}>
          Supprimer l'Article
        </button>
      </div>

      <div style={styles.section}>
        <h2 style={styles.title}>Mettre à Jour la Quantité d'un Article</h2>
        <div>
          <label>ID de l'Article du Panier: </label>
          <input
            style={styles.input}
            type="text"
            value={cartItemIdToUpdate}
            onChange={(e) => setCartItemIdToUpdate(e.target.value)}
            placeholder="UUID de l'article du panier"
          />
        </div>
        <div>
          <label>Nouvelle Quantité: </label>
          <input
            style={styles.input}
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <button style={styles.button} onClick={handleUpdateCartItemQuantity} disabled={isLoading}>
          Mettre à Jour la Quantité
        </button>
      </div>
    </div>
  );
}
