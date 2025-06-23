"use server";

import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getCart } from "@/lib/cartReader";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * @description Crée une session de checkout Stripe pour le panier actuel de l'utilisateur.
 * Cette action serveur récupère le panier, le valide, et construit une session de paiement Stripe.
 * Elle est conçue pour être appelée depuis un composant client qui redirigera ensuite l'utilisateur vers la page de paiement Stripe.
 * @returns Un objet contenant soit le `sessionId` en cas de succès, soit un message d'erreur.
 */
export async function createStripeCheckoutSession(): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const headersList = await headers();
  const locale = headersList.get("x-next-intl-locale") || "fr";

  const cartResult = await getCart();
  if (!cartResult.success || !cartResult.data) {
    return { success: false, error: cartResult.message || "Votre panier est vide." };
  }

  const cart = cartResult.data;
  if (cart.items.length === 0) {
    return { success: false, error: "Votre panier est vide." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Utilisateur non authentifié. Veuillez vous connecter pour procéder au paiement.",
    };
  }

  const userEmail = user.email?.trim();

  if (!userEmail) {
    console.error(`Stripe Action Error: User ${user.id} has an invalid email address.`);
    return {
      success: false,
      error:
        "Votre compte utilisateur n'a pas d'adresse e-mail valide. Veuillez contacter le support.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set in the environment variables.");
  }

  try {
    // 1. Récupérer les IDs des produits du panier
    const productIds = cart.items.map((item) => item.productId);

    // 2. Récupérer les détails des produits depuis la base de données pour valider les prix
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .in("id", productIds);

    if (productsError) {
      console.error("Error fetching products for price validation:", productsError);
      return { success: false, error: "Erreur lors de la validation des produits." };
    }

    // 3. Créer une map pour un accès rapide aux prix validés
    const productPriceMap = new Map(products.map((p) => [p.id, p]));

    // 4. Construire les line_items avec les données validées
    const line_items = cart.items.map((item) => {
      const product = productPriceMap.get(item.productId);
      if (!product) {
        throw new Error(`Produit ${item.productId} non trouvé lors de la validation.`);
      }

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
            images: product.image_url
              ? [
                  product.image_url.startsWith("/")
                    ? `${baseUrl}${product.image_url}`
                    : product.image_url,
                ]
              : [],
          },
          unit_amount: Math.round(product.price * 100), // Utilisation du prix validé
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${baseUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/checkout/canceled`,
      client_reference_id: cart.id,
      customer_email: userEmail,
    });

    if (!session.id) {
      return { success: false, error: "Erreur lors de la création de la session Stripe." };
    }

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("[STRIPE_ACTION_ERROR]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Une erreur interne est survenue.";
    return { success: false, error: errorMessage };
  }
}
