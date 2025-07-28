"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { getCart } from "@/lib/cartReader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { Address } from "@/types";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { 
  CheckoutBusinessError, 
  CheckoutErrorCode,
  CheckoutSessionResult 
} from "@/lib/domain/services/checkout.service";
import { ProductValidationService } from "@/lib/domain/services/product-validation.service";
import { AddressValidationService } from "@/lib/domain/services/address-validation.service";
import { ErrorUtils } from "@/lib/core/errors";

// interface Product - plus nécessaire, remplacé par ProductValidationService

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
 * @returns ActionResult contenant sessionId et url de redirection en cas de succès.
 */
export async function createStripeCheckoutSession(
  shippingAddress: Address,
  billingAddress: Address,
  shippingMethodId: string
): Promise<ActionResult<CheckoutSessionResult>> {
  const context = LogUtils.createUserActionContext('unknown', 'create_stripe_checkout', 'stripe');
  LogUtils.logOperationStart('create_stripe_checkout', context);

  try {
    // Validation des paramètres d'entrée
    if (!shippingAddress) {
      throw new CheckoutBusinessError(CheckoutErrorCode.INVALID_ADDRESS, "L'adresse de livraison est requise");
    }
    if (!billingAddress) {
      throw new CheckoutBusinessError(CheckoutErrorCode.INVALID_ADDRESS, "L'adresse de facturation est requise");
    }
    if (!shippingMethodId) {
      throw new CheckoutBusinessError(CheckoutErrorCode.INVALID_SHIPPING_METHOD, "La méthode de livraison est requise");
    }

  const supabase = await createSupabaseServerClient();
  const headersList = await headers();
  const locale = headersList.get("x-next-intl-locale") || "fr";

    // Vérification du panier
    const cartResult = await getCart();
    if (!cartResult.success || !cartResult.data) {
      throw new CheckoutBusinessError(CheckoutErrorCode.EMPTY_CART, cartResult.message || "Votre panier est vide");
    }

    const cart = cartResult.data;
    if (cart.items.length === 0) {
      throw new CheckoutBusinessError(CheckoutErrorCode.EMPTY_CART, "Votre panier est vide");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      context.userId = user.id;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL is not set");
    }

    // Validation des adresses avec le service dédié
    const addressValidationService = new AddressValidationService();
    const addressValidationResult = await addressValidationService.validateAndProcessAddresses(
      shippingAddress,
      billingAddress,
      user?.id,
      {
        allowGuestAddresses: true,
        allowedCountries: ["FR", "GB", "DE", "ES", "IT", "US", "CA", "BE", "CH", "LU"]
      }
    );

    if (!addressValidationResult.success) {
      return addressValidationResult;
    }

    const processedAddresses = addressValidationResult.data!;

    // Revalidation des pages si des adresses ont été sauvegardées
    if (processedAddresses.shippingAddressId || processedAddresses.billingAddressId) {
      revalidatePath("/[locale]/profile/addresses");
      revalidatePath("/[locale]/checkout");
    }

    // Validation des produits avec le service dédié
    const productValidationService = new ProductValidationService();
    const cartItems = cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    const productValidationResult = await productValidationService.validateCartProducts(cartItems);
    if (!productValidationResult.success) {
      return productValidationResult;
    }

    const validatedCart = productValidationResult.data!;

    // Création de la map des produits validés
    const productPriceMap = new Map(
      validatedCart.items.map(item => [
        item.productId, 
        {
          id: item.productId,
          name: item.name,
          price: item.price,
          image_url: null // Sera récupérée plus tard si nécessaire
        }
      ])
    );

    // Validation de la méthode de livraison
    const { data: shippingMethod, error: shippingError } = await supabase
      .from("shipping_methods")
      .select("id, name, price")
      .eq("id", shippingMethodId)
      .eq("is_active", true)
      .single<ShippingMethod>();

    if (shippingError || !shippingMethod) {
      throw new CheckoutBusinessError(
        CheckoutErrorCode.INVALID_SHIPPING_METHOD,
        "La méthode de livraison sélectionnée n'est pas valide"
      );
    }

    // Construction des line_items Stripe avec les produits validés
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => {
      const product = productPriceMap.get(item.productId);
      if (!product) {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.PRODUCT_NOT_FOUND,
          `Produit ${item.productId} non trouvé`
        );
      }
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
      payment_method_types: ["card", "paypal"],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/checkout`,
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: shippingMethod.price * 100,
              currency: "eur",
            },
            display_name: shippingMethod.name,
            // ✅ Supprimer delivery_estimate qui utilisait des colonnes inexistantes
            // Si vous avez besoin d'estimations de livraison, ajoutez ces colonnes à votre DB
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ["FR", "GB", "DE", "ES", "IT", "US", "CA", "BE", "CH", "LU"],
      },
      metadata: {
        cartId: cart.id,
        userId: user?.id || "guest",
        shippingAddressId: processedAddresses.shippingAddressId || "guest_address",
        billingAddressId: processedAddresses.billingAddressId || "guest_address",
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
      sessionParams.customer_creation = "always";
      sessionParams.customer_email = billingAddress.email || undefined; // ✅ Convertir null vers undefined
      sessionParams.billing_address_collection = "required";
    }

    // Création de la session Stripe
    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.id || !session.url) {
      throw new CheckoutBusinessError(
        CheckoutErrorCode.STRIPE_SESSION_CREATION_FAILED,
        "Erreur lors de la création de la session Stripe"
      );
    }

    const result: CheckoutSessionResult = {
      sessionUrl: session.url,
      sessionId: session.id
    };

    LogUtils.logOperationSuccess('create_stripe_checkout', {
      ...context,
      sessionId: session.id,
      totalAmount: validatedCart.totalAmount,
      isGuestCheckout: processedAddresses.isGuestCheckout
    });

    return ActionResult.ok(result, 'Session de checkout créée avec succès');
  } catch (error) {
    LogUtils.logOperationError('create_stripe_checkout', error, context);
    
    if (error instanceof CheckoutBusinessError) {
      return ActionResult.error(error.message);
    }
    
    return ActionResult.error(
      ErrorUtils.isAppError(error) 
        ? ErrorUtils.formatForUser(error) 
        : 'Une erreur inattendue est survenue lors du checkout'
    );
  }
}
