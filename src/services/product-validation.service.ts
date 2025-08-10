/**
 * Service de validation des produits pour le checkout
 * Valide la disponibilité, le stock et les prix des produits du panier
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { CheckoutBusinessError, CheckoutErrorCode, CartValidationResult } from "./checkout.service";
import { ErrorUtils } from "@/lib/core/errors";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  stock_quantity: number;
}

/**
 * Service de validation des produits dans le panier
 */
export class ProductValidationService {
  constructor(private logger = LogUtils) {}

  /**
   * Valide tous les produits du panier
   */
  async validateCartProducts(cartItems: CartItem[]): Promise<ActionResult<CartValidationResult>> {
    const context = this.logger.createUserActionContext(
      "unknown",
      "validate_cart_products",
      "checkout"
    );

    this.logger.logOperationStart("validate_cart_products", {
      ...context,
      itemCount: cartItems.length,
    });

    try {
      if (!cartItems || cartItems.length === 0) {
        throw new CheckoutBusinessError(CheckoutErrorCode.EMPTY_CART, "Le panier est vide");
      }

      const supabase = await createSupabaseServerClient();
      const productIds = cartItems.map((item) => item.productId);

      // Récupération des produits en base
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, image_url, is_available, stock_quantity")
        .in("id", productIds)
        .returns<Product[]>();

      if (productsError) {
        throw ErrorUtils.fromSupabaseError(productsError);
      }

      // Validation de chaque produit
      const validatedItems = [];
      let totalAmount = 0;

      for (const cartItem of cartItems) {
        const product = products?.find((p) => p.id === cartItem.productId);

        if (!product) {
          throw new CheckoutBusinessError(
            CheckoutErrorCode.PRODUCT_NOT_FOUND,
            `Produit non trouvé: ${cartItem.productId}`
          );
        }

        if (!product.is_available) {
          throw new CheckoutBusinessError(
            CheckoutErrorCode.PRODUCT_UNAVAILABLE,
            `Produit non disponible: ${product.name}`
          );
        }

        if (product.stock_quantity < cartItem.quantity) {
          throw new CheckoutBusinessError(
            CheckoutErrorCode.INSUFFICIENT_STOCK,
            `Stock insuffisant pour ${product.name}. Disponible: ${product.stock_quantity}, Demandé: ${cartItem.quantity}`
          );
        }

        const itemTotal = product.price * cartItem.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          productId: product.id,
          quantity: cartItem.quantity,
          availableStock: product.stock_quantity,
          price: product.price,
          name: product.name,
        });
      }

      const result: CartValidationResult = {
        isValid: true,
        items: validatedItems,
        totalAmount,
      };

      this.logger.logOperationSuccess("validate_cart_products", {
        ...context,
        validatedItemsCount: validatedItems.length,
        totalAmount,
      });

      return ActionResult.ok(result);
    } catch (error) {
      this.logger.logOperationError("validate_cart_products", error, context);

      if (error instanceof CheckoutBusinessError) {
        return ActionResult.error(error.message);
      }

      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Erreur lors de la validation des produits"
      );
    }
  }

  /**
   * Valide la disponibilité d'un produit spécifique
   */
  async validateSingleProduct(
    productId: string,
    requestedQuantity: number
  ): Promise<ActionResult<Product>> {
    try {
      const supabase = await createSupabaseServerClient();

      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single<Product>();

      if (error) {
        throw ErrorUtils.fromSupabaseError(error);
      }

      if (!product.is_available) {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.PRODUCT_UNAVAILABLE,
          `Produit non disponible: ${product.name}`
        );
      }

      if (product.stock_quantity < requestedQuantity) {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.INSUFFICIENT_STOCK,
          `Stock insuffisant pour ${product.name}`
        );
      }

      return ActionResult.ok(product);
    } catch (error) {
      if (error instanceof CheckoutBusinessError) {
        return ActionResult.error(error.message);
      }

      return ActionResult.error("Erreur lors de la validation du produit");
    }
  }
}
