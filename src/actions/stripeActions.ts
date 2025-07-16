"use server";

import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getCart } from "@/lib/cartReader";
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe';
import { Address } from "@/types";
import type { ServerCartItem } from "@/lib/supabase/types"; // ✅ Importer le type correct

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

// ✅ Interface pour les méthodes de livraison selon le schéma DB réel
interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  // Pas de delivery_time_min/max dans le schéma DB actuel
}

/**
 * @description Crée une session de checkout Stripe pour le panier actuel.
 * Gère les utilisateurs authentifiés et invités, ainsi que les adresses nouvelles ou existantes.
 * @returns Un objet contenant soit le `sessionId` et l'`url` en cas de succès, soit un message d'erreur.
 */
export async function createStripeCheckoutSession(
  shippingAddress: Address,
  billingAddress: Address,
  shippingMethodId: string
): Promise<{
  success: boolean;
  sessionId?: string;
  url?: string | null;
  error?: string;
}> {
  if (!shippingAddress) {
    return { success: false, error: "L'adresse de livraison est requise." };
  }
  if (!billingAddress) {
    return { success: false, error: "L'adresse de facturation est requise." };
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
    let finalShippingAddressId: string | null = null;
    let finalBillingAddressId: string | null = null;

    const processAddress = async (address: Address, type: 'shipping' | 'billing'): Promise<string | null> => {
      if ('id' in address && !address.id.startsWith('temp-')) {
        return address.id;
      }
      if (user) {
        const { data: newAddress, error: insertError } = await supabase
          .from('addresses')
          .insert({ ...address, id: undefined, user_id: user.id, address_type: type })
          .select()
          .single();
        if (insertError) {
          console.error(`Error saving new ${type} address:`, insertError);
          throw new Error(`Erreur lors de la sauvegarde de la nouvelle adresse de ${type}.`);
        }
        return newAddress.id;
      }
      return null; // Guest address, not saved to DB
    };

    try {
      finalShippingAddressId = await processAddress(shippingAddress, 'shipping');
      finalBillingAddressId = await processAddress(billingAddress, 'billing');
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    // ✅ Valider les produits avec le bon type
    const productIds = cart.items.map((item: ServerCartItem) => item.product_id); // ✅ Utiliser product_id selon le schéma
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .in("id", productIds)
      .returns<Product[]>();

    if (productsError) throw new Error("Erreur lors de la validation des produits.");

    const productPriceMap = new Map(products.map((p: Product) => [p.id, p]));

    // ✅ Requête corrigée pour les méthodes de livraison selon le schéma DB réel
    const { data: shippingMethod, error: shippingError } = await supabase
      .from("shipping_methods")
      .select("id, name, price") // ✅ Supprimer delivery_time_min/max qui n'existent pas
      .eq("id", shippingMethodId)
      .eq("is_active", true)
      .single<ShippingMethod>();

    if (shippingError || !shippingMethod) {
      throw new Error("La méthode de livraison sélectionnée n'est pas valide.");
    }

    // ✅ Construire les line_items avec le bon type
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item: ServerCartItem) => {
      const product = productPriceMap.get(item.product_id); // ✅ Utiliser product_id
      if (!product) throw new Error(`Produit ${item.product_id} non trouvé.`);
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
      payment_method_types: ['card', 'paypal'],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/checkout`,
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: shippingMethod.price * 100,
              currency: 'eur',
            },
            display_name: shippingMethod.name,
            // ✅ Supprimer delivery_estimate qui utilisait des colonnes inexistantes
            // Si vous avez besoin d'estimations de livraison, ajoutez ces colonnes à votre DB
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['FR', 'GB', 'DE', 'ES', 'IT', 'US', 'CA', 'BE', 'CH', 'LU'],
      },
      metadata: {
        cartId: cart.id,
        userId: user?.id || 'guest',
        shippingAddressId: finalShippingAddressId || 'guest_address',
        billingAddressId: finalBillingAddressId || 'guest_address',
        shippingMethodId: shippingMethodId,
      },
    };

    if (user) {
      // ✅ Les profils n'ont pas de stripe_customer_id dans votre schéma actuel
      // Si vous voulez cette fonctionnalité, ajoutez cette colonne à la table profiles
      // Pour l'instant, on commente cette partie ou on utilise l'email uniquement
      sessionParams.customer_email = user.email;
      
      // TODO: Ajouter stripe_customer_id à la table profiles si nécessaire
      // const { data: profile } = await supabase
      //   .from('profiles')
      //   .select('stripe_customer_id')
      //   .eq('id', user.id)
      //   .single();
      // sessionParams.customer = profile?.stripe_customer_id || undefined;
    } else {
      // Pour les utilisateurs invités, laisser Stripe créer un client.
      sessionParams.customer_creation = 'always';
      sessionParams.customer_email = billingAddress.email;
      sessionParams.billing_address_collection = 'required';
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