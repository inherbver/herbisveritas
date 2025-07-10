"use server";

import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getCart } from "@/lib/cartReader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Address } from "@/types";
import Stripe from "stripe";

// Type pour les données d'une nouvelle adresse, sans les champs générés par la BDD
 type NewAddressData = Omit<Address, "id" | "user_id" | "created_at">;

/**
 * @description Crée une session de checkout Stripe pour le panier actuel.
 * Gère les utilisateurs authentifiés et invités, ainsi que les adresses nouvelles ou existantes.
 * @returns Un objet contenant soit le `sessionId` et l'`url` en cas de succès, soit un message d'erreur.
 */
export async function createStripeCheckoutSession(
  addressData: Address | NewAddressData,
  shippingMethodId: string
): Promise<{
  success: boolean;
  sessionId?: string;
  url?: string | null;
  error?: string;
}> {
  if (!addressData) {
    return { success: false, error: "L'adresse de livraison est requise." };
  }
  if (!shippingMethodId) {
    return { success: false, error: "La méthode de livraison est requise." };
  }

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

  const { data: { user } } = await supabase.auth.getUser();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set.");
  }

  try {
    let finalAddressId: string | null = null;

    // Gérer l'adresse
    if ("id" in addressData) {
      // Adresse existante
      finalAddressId = addressData.id;
    } else if (user) {
      // Nouvelle adresse pour un utilisateur authentifié
      const { data: newAddress, error: insertError } = await supabase
        .from("addresses")
        .insert({ ...addressData, user_id: user.id })
        .select()
        .single();

      if (insertError || !newAddress) {
        console.error("Error saving new address:", insertError);
        return { success: false, error: "Erreur lors de la sauvegarde de la nouvelle adresse." };
      }
      finalAddressId = newAddress.id;
    }
    // Pour les invités avec une nouvelle adresse, la logique est gérée plus bas
    // en utilisant `shipping_address_collection`.

    // Valider les produits et la méthode de livraison (logique existante)
    const productIds = cart.items.map((item) => item.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .in("id", productIds);

    if (productsError) throw new Error("Erreur lors de la validation des produits.");

    const productPriceMap = new Map(products.map((p) => [p.id, p]));

    const { data: shippingMethod, error: shippingError } = await supabase
      .from("shipping_methods")
      .select("id, name, price")
      .eq("id", shippingMethodId)
      .eq("is_active", true)
      .single();

    if (shippingError || !shippingMethod) {
      throw new Error("La méthode de livraison sélectionnée n'est pas valide.");
    }

    // Construire les line_items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => {
      const product = productPriceMap.get(item.productId);
      if (!product) throw new Error(`Produit ${item.productId} non trouvé.`);
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
            images: product.image_url ? [`${baseUrl}${product.image_url}`] : [],
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Créer la session Stripe
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/checkout/canceled`,
      client_reference_id: cart.id,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: Math.round(Number(shippingMethod.price) * 100), currency: 'eur' },
            display_name: shippingMethod.name,
          },
        },
      ],
      metadata: {
        cartId: cart.id,
        userId: user?.id || "guest",
        shippingAddressId: finalAddressId || "guest_address",
        shippingMethodId: shippingMethodId,
      },
    };

    if (user?.email) {
      sessionParams.customer_email = user.email;
    } else {
      // Pour les invités, permettre à Stripe de collecter l'email
      sessionParams.customer_creation = 'always';
    }
    
    // Pour les invités, pré-remplir l'adresse
    if (!user && !("id" in addressData)) {
        sessionParams.shipping_address_collection = {
            allowed_countries: ['FR', 'BE', 'CH', 'LU', 'DE', 'ES', 'IT', 'GB', 'US', 'CA'],
        };
        // On ne peut pas préremplir l'adresse et la collecter en même temps.
        // La meilleure approche est de laisser Stripe la collecter pour assurer la validité.
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.id || !session.url) {
      return { success: false, error: "Erreur lors de la création de la session Stripe." };
    }

    return { success: true, sessionId: session.id, url: session.url };

  } catch (error) {
    console.error("[STRIPE_ACTION_ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : "Une erreur interne est survenue.";
    return { success: false, error: errorMessage };
  }
}
