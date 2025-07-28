/**
 * Service de validation des adresses pour le checkout
 * Valide les formats d'adresses et gère les adresses invités/utilisateurs connectés
 */

import { Address } from "@/types";
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { 
  CheckoutBusinessError, 
  CheckoutErrorCode 
} from "./checkout.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ErrorUtils } from "@/lib/core/errors";

export interface AddressValidationOptions {
  allowGuestAddresses?: boolean;
  requiresBillingAddress?: boolean;
  allowedCountries?: string[];
}

export interface ProcessedAddresses {
  shippingAddressId: string | null;
  billingAddressId: string | null;
  isGuestCheckout: boolean;
}

/**
 * Service de validation et traitement des adresses
 */
export class AddressValidationService {
  constructor(private logger = LogUtils) {}

  /**
   * Valide et traite les adresses de livraison et facturation
   */
  async validateAndProcessAddresses(
    shippingAddress: Address,
    billingAddress: Address,
    userId?: string,
    options: AddressValidationOptions = {}
  ): Promise<ActionResult<ProcessedAddresses>> {
    const context = this.logger.createUserActionContext(
      userId || 'guest', 
      'validate_addresses', 
      'checkout'
    );
    
    this.logger.logOperationStart('validate_addresses', context);

    try {
      // Validation de base des adresses
      this.validateAddressFormat(shippingAddress, 'shipping');
      this.validateAddressFormat(billingAddress, 'billing');

      // Validation des pays autorisés
      if (options.allowedCountries) {
        this.validateCountries(shippingAddress, billingAddress, options.allowedCountries);
      }

      // Traitement des adresses selon le type d'utilisateur
      const processedAddresses = userId 
        ? await this.processAuthenticatedUserAddresses(shippingAddress, billingAddress, userId)
        : await this.processGuestAddresses(shippingAddress, billingAddress, options);

      this.logger.logOperationSuccess('validate_addresses', {
        ...context,
        isGuestCheckout: !userId,
        hasStoredAddresses: !!processedAddresses.shippingAddressId
      });

      return ActionResult.ok(processedAddresses);
    } catch (error) {
      this.logger.logOperationError('validate_addresses', error, context);
      
      if (error instanceof CheckoutBusinessError) {
        return ActionResult.error(error.message);
      }
      
      return ActionResult.error(
        ErrorUtils.isAppError(error) 
          ? ErrorUtils.formatForUser(error) 
          : 'Erreur lors de la validation des adresses'
      );
    }
  }

  /**
   * Valide le format d'une adresse
   */
  private validateAddressFormat(address: Address, type: 'shipping' | 'billing'): void {
    const requiredFields = ['first_name', 'last_name', 'street', 'city', 'postal_code', 'country'];
    
    for (const field of requiredFields) {
      if (!address[field as keyof Address] || String(address[field as keyof Address]).trim() === '') {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.INVALID_ADDRESS,
          `Champ manquant dans l'adresse de ${type === 'shipping' ? 'livraison' : 'facturation'}: ${field}`
        );
      }
    }

    // Validation email pour facturation (invités)
    if (type === 'billing' && address.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(address.email)) {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.INVALID_ADDRESS,
          "Format d'email invalide dans l'adresse de facturation"
        );
      }
    }

    // Validation code postal français (exemple)
    if (address.country === 'FR' && address.postal_code) {
      const frPostalRegex = /^[0-9]{5}$/;
      if (!frPostalRegex.test(address.postal_code)) {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.INVALID_ADDRESS,
          "Format de code postal français invalide"
        );
      }
    }
  }

  /**
   * Valide les pays autorisés
   */
  private validateCountries(
    shippingAddress: Address, 
    billingAddress: Address, 
    allowedCountries: string[]
  ): void {
    if (!allowedCountries.includes(shippingAddress.country)) {
      throw new CheckoutBusinessError(
        CheckoutErrorCode.INVALID_ADDRESS,
        `Livraison non disponible pour le pays: ${shippingAddress.country}`
      );
    }

    if (!allowedCountries.includes(billingAddress.country)) {
      throw new CheckoutBusinessError(
        CheckoutErrorCode.INVALID_ADDRESS,
        `Facturation non disponible pour le pays: ${billingAddress.country}`
      );
    }
  }

  /**
   * Traite les adresses pour un utilisateur authentifié
   */
  private async processAuthenticatedUserAddresses(
    shippingAddress: Address,
    billingAddress: Address,
    userId: string
  ): Promise<ProcessedAddresses> {
    const supabase = await createSupabaseServerClient();
    
    const processAddress = async (
      address: Address,
      type: 'shipping' | 'billing'
    ): Promise<string | null> => {
      // Si l'adresse a un ID et n'est pas temporaire, l'utiliser
      if ('id' in address && address.id && !address.id.startsWith('temp-')) {
        return address.id;
      }

      // Sinon, créer une nouvelle adresse
      const { data: newAddress, error } = await supabase
        .from('addresses')
        .insert({
          ...address,
          id: undefined, // Laisser Supabase générer l'ID
          user_id: userId,
          address_type: type
        })
        .select()
        .single();

      if (error) {
        throw ErrorUtils.fromSupabaseError(error);
      }

      return newAddress.id;
    };

    const [shippingAddressId, billingAddressId] = await Promise.all([
      processAddress(shippingAddress, 'shipping'),
      processAddress(billingAddress, 'billing')
    ]);

    return {
      shippingAddressId,
      billingAddressId,
      isGuestCheckout: false
    };
  }

  /**
   * Traite les adresses pour un utilisateur invité
   */
  private async processGuestAddresses(
    shippingAddress: Address,
    billingAddress: Address,
    options: AddressValidationOptions
  ): Promise<ProcessedAddresses> {
    if (!options.allowGuestAddresses) {
      throw new CheckoutBusinessError(
        CheckoutErrorCode.INVALID_ADDRESS,
        "Checkout invité non autorisé"
      );
    }

    // Pour les invités, pas de sauvegarde en base
    // Les adresses seront stockées dans les métadonnées Stripe
    return {
      shippingAddressId: null,
      billingAddressId: null,
      isGuestCheckout: true
    };
  }

  /**
   * Récupère les méthodes de livraison disponibles pour une adresse
   */
  async getAvailableShippingMethods(
    _shippingAddress: Address
  ): Promise<ActionResult<Array<{ id: string; name: string; price: number }>>> {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Requête des méthodes de livraison actives
      // Possibilité d'ajouter des filtres par pays/zone plus tard
      const { data: shippingMethods, error } = await supabase
        .from('shipping_methods')
        .select('id, name, price')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        throw ErrorUtils.fromSupabaseError(error);
      }

      return ActionResult.ok(shippingMethods || []);
    } catch (_error) {
      return ActionResult.error('Erreur lors de la récupération des méthodes de livraison');
    }
  }
}