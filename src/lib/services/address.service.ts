/**
 * Address Service - Couche d'intégration avec migration progressive
 *
 * Cette couche utilise les feature flags pour décider entre l'ancien système
 * (addressActions) et le nouveau AddressRepository.
 *
 * Pattern "Strangler Fig" : remplace progressivement l'ancien code.
 */

import { Result } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { isRepositoryEnabled } from "@/lib/config/feature-flags";
import { AddressSupabaseRepository } from "@/lib/infrastructure/repositories/address.supabase.repository";
import type {
  IAddressRepository,
  Address,
  AddressType,
  CreateAddressData,
  UpdateAddressData,
  AddressFilters,
  UserAddressSummary,
} from "@/lib/domain/interfaces/address.repository.interface";

// Import des anciennes fonctions (fallback)
import {
  addAddress,
  updateAddress,
  deleteAddress,
  getUserAddresses,
} from "@/actions/addressActions";
import type { AddressFormData } from "@/lib/validators/address.validator";

export class AddressService {
  private repository: IAddressRepository;

  constructor() {
    this.repository = new AddressSupabaseRepository();
  }

  // === Opérations CRUD principales ===

  /**
   * Obtenir toutes les adresses d'un utilisateur
   */
  async getUserAddresses(
    userId: string,
    filters?: AddressFilters
  ): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext("getUserAddresses", "address-service");
    LogUtils.logOperationStart("getUserAddresses", { ...context, userId, filters });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("getUserAddresses", "Using new AddressRepository", context);
        const result = await this.repository.findByUserId(userId, filters);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("getUserAddresses", {
            ...context,
            source: "repository",
            count: result.getValue()!.length,
          });
          return result;
        }

        LogUtils.logOperationWarning(
          "getUserAddresses",
          "Repository failed, falling back to legacy",
          context
        );
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo("getUserAddresses", "Using legacy addressActions", context);
      const legacyResult = await getUserAddresses();

      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess("getUserAddresses", {
          ...context,
          source: "legacy",
          count: legacyResult.data.length,
        });
        return Result.success(legacyResult.data as Address[]);
      }

      LogUtils.logOperationError("getUserAddresses", "Legacy getUserAddresses failed", context);
      return Result.failure(new Error("Failed to get addresses from legacy system"));
    } catch (error) {
      LogUtils.logOperationError("getUserAddresses", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Créer une nouvelle adresse
   */
  async createAddress(
    userId: string,
    addressData: CreateAddressData,
    locale: string = "fr"
  ): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext("createAddress", "address-service");
    LogUtils.logOperationStart("createAddress", {
      ...context,
      userId,
      addressType: addressData.address_type,
    });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("createAddress", "Using new AddressRepository", context);

        // Validation et normalisation via repository
        const validationResult = await this.repository.validateAddressData(addressData);
        if (!validationResult.isSuccess()) {
          LogUtils.logOperationError("createAddress", validationResult.getError(), context);
          return Result.failure(validationResult.getError()!);
        }

        const normalizedResult = await this.repository.normalizeAddress(addressData);
        if (!normalizedResult.isSuccess()) {
          LogUtils.logOperationError("createAddress", normalizedResult.getError(), context);
          return Result.failure(normalizedResult.getError()!);
        }

        const result = await this.repository.createAddress(
          userId,
          normalizedResult.getValue()! as CreateAddressData
        );

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("createAddress", {
            ...context,
            source: "repository",
            addressId: result.getValue()!.id,
          });
          return result;
        }

        LogUtils.logOperationWarning(
          "createAddress",
          "Repository failed, falling back to legacy",
          context
        );
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo("createAddress", "Using legacy addressActions", context);

      // Conversion des données pour le format legacy
      const legacyData: AddressFormData = {
        address_type: addressData.address_type,
        company_name: addressData.company_name || "",
        first_name: addressData.first_name,
        last_name: addressData.last_name,
        email: addressData.email || "",
        street_number: addressData.street_number || "",
        address_line1: addressData.address_line1,
        address_line2: addressData.address_line2 || "",
        postal_code: addressData.postal_code,
        city: addressData.city,
        country_code: addressData.country_code,
        state_province_region: addressData.state_province_region || "",
        phone_number: addressData.phone_number || "",
      };

      const legacyResult = await addAddress(legacyData, locale);

      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess("createAddress", {
          ...context,
          source: "legacy",
        });
        return Result.success(legacyResult.data as Address);
      }

      LogUtils.logOperationError("createAddress", "Legacy addAddress failed", context);
      return Result.failure(
        new Error(legacyResult.error || "Failed to create address via legacy system")
      );
    } catch (error) {
      LogUtils.logOperationError("createAddress", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Mettre à jour une adresse existante
   */
  async updateAddress(
    addressId: string,
    userId: string,
    addressData: UpdateAddressData,
    locale: string = "fr"
  ): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext("updateAddress", "address-service");
    LogUtils.logOperationStart("updateAddress", { ...context, addressId, userId });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("updateAddress", "Using new AddressRepository", context);

        // Validation et normalisation via repository
        const validationResult = await this.repository.validateAddressData(addressData);
        if (!validationResult.isSuccess()) {
          return Result.failure(validationResult.getError()!);
        }

        const normalizedResult = await this.repository.normalizeAddress(addressData);
        if (!normalizedResult.isSuccess()) {
          return Result.failure(normalizedResult.getError()!);
        }

        const result = await this.repository.updateAddress(
          addressId,
          userId,
          normalizedResult.getValue()! as UpdateAddressData
        );

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("updateAddress", {
            ...context,
            source: "repository",
          });
          return result;
        }

        LogUtils.logOperationWarning(
          "updateAddress",
          "Repository failed, falling back to legacy",
          context
        );
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo("updateAddress", "Using legacy addressActions", context);

      // Pour le legacy, on doit convertir les données partielles en format complet
      const legacyData: Partial<AddressFormData> = {
        address_type: addressData.address_type,
        company_name: addressData.company_name,
        first_name: addressData.first_name,
        last_name: addressData.last_name,
        email: addressData.email || undefined,
        street_number: addressData.street_number,
        address_line1: addressData.address_line1,
        address_line2: addressData.address_line2,
        postal_code: addressData.postal_code,
        city: addressData.city,
        country_code: addressData.country_code,
        state_province_region: addressData.state_province_region,
        phone_number: addressData.phone_number,
      };

      const legacyResult = await updateAddress(addressId, legacyData as AddressFormData, locale);

      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess("updateAddress", {
          ...context,
          source: "legacy",
        });
        return Result.success(legacyResult.data as Address);
      }

      LogUtils.logOperationError("updateAddress", "Legacy updateAddress failed", context);
      return Result.failure(
        new Error(legacyResult.error || "Failed to update address via legacy system")
      );
    } catch (error) {
      LogUtils.logOperationError("updateAddress", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Supprimer une adresse
   */
  async deleteAddress(addressId: string, userId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("deleteAddress", "address-service");
    LogUtils.logOperationStart("deleteAddress", { ...context, addressId, userId });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("deleteAddress", "Using new AddressRepository", context);
        const result = await this.repository.deleteAddress(addressId, userId);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("deleteAddress", {
            ...context,
            source: "repository",
          });
          return result;
        }

        LogUtils.logOperationWarning(
          "deleteAddress",
          "Repository failed, falling back to legacy",
          context
        );
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo("deleteAddress", "Using legacy addressActions", context);
      const legacyResult = await deleteAddress(addressId);

      if (legacyResult.success) {
        LogUtils.logOperationSuccess("deleteAddress", {
          ...context,
          source: "legacy",
        });
        return Result.success(undefined);
      }

      LogUtils.logOperationError("deleteAddress", "Legacy deleteAddress failed", context);
      return Result.failure(
        new Error(legacyResult.error || "Failed to delete address via legacy system")
      );
    } catch (error) {
      LogUtils.logOperationError("deleteAddress", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  // === Opérations spécialisées (Repository uniquement) ===

  /**
   * Obtenir les adresses par type
   */
  async getAddressesByType(userId: string, type: AddressType): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext("getAddressesByType", "address-service");
    LogUtils.logOperationStart("getAddressesByType", { ...context, userId, type });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("getAddressesByType", "Using new AddressRepository", context);
        const result = await this.repository.findByUserIdAndType(userId, type);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("getAddressesByType", {
            ...context,
            source: "repository",
            count: result.getValue()!.length,
          });
          return result;
        }
      }

      // Fallback: filtrer les adresses récupérées via getUserAddresses
      LogUtils.logOperationInfo("getAddressesByType", "Using fallback filtering", context);
      const allAddressesResult = await this.getUserAddresses(userId);

      if (allAddressesResult.isSuccess()) {
        const filtered = allAddressesResult
          .getValue()!
          .filter((addr) => addr.address_type === type);
        LogUtils.logOperationSuccess("getAddressesByType", {
          ...context,
          source: "filtered",
          count: filtered.length,
        });
        return Result.success(filtered);
      }

      return allAddressesResult;
    } catch (error) {
      LogUtils.logOperationError("getAddressesByType", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Obtenir l'adresse par défaut d'un type
   */
  async getDefaultAddress(
    userId: string,
    type: AddressType
  ): Promise<Result<Address | null, Error>> {
    const context = LogUtils.createOperationContext("getDefaultAddress", "address-service");
    LogUtils.logOperationStart("getDefaultAddress", { ...context, userId, type });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("getDefaultAddress", "Using new AddressRepository", context);
        const result = await this.repository.findDefaultByType(userId, type);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("getDefaultAddress", {
            ...context,
            source: "repository",
            found: !!result.getValue(),
          });
          return result;
        }
      }

      // Fallback: chercher dans toutes les adresses
      LogUtils.logOperationInfo("getDefaultAddress", "Using fallback search", context);
      const addressesResult = await this.getAddressesByType(userId, type);

      if (addressesResult.isSuccess()) {
        const defaultAddress = addressesResult.getValue()!.find((addr) => addr.is_default);
        LogUtils.logOperationSuccess("getDefaultAddress", {
          ...context,
          source: "filtered",
          found: !!defaultAddress,
        });
        return Result.success(defaultAddress || null);
      }

      return Result.failure(addressesResult.getError()!);
    } catch (error) {
      LogUtils.logOperationError("getDefaultAddress", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Définir une adresse comme par défaut
   */
  async setAsDefault(
    addressId: string,
    userId: string,
    type: AddressType
  ): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext("setAsDefault", "address-service");
    LogUtils.logOperationStart("setAsDefault", { ...context, addressId, userId, type });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("setAsDefault", "Using new AddressRepository", context);
        const result = await this.repository.setAsDefault(addressId, userId, type);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("setAsDefault", {
            ...context,
            source: "repository",
          });
          return result;
        }
      }

      // Fallback: utiliser updateAddress avec is_default = true
      LogUtils.logOperationInfo("setAsDefault", "Using fallback update", context);
      return await this.updateAddress(addressId, userId, { is_default: true });
    } catch (error) {
      LogUtils.logOperationError("setAsDefault", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Obtenir un résumé des adresses utilisateur
   */
  async getUserAddressSummary(userId: string): Promise<Result<UserAddressSummary, Error>> {
    const context = LogUtils.createOperationContext("getUserAddressSummary", "address-service");
    LogUtils.logOperationStart("getUserAddressSummary", { ...context, userId });

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("getUserAddressSummary", "Using new AddressRepository", context);
        const result = await this.repository.getUserAddressSummary(userId);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("getUserAddressSummary", {
            ...context,
            source: "repository",
            totalAddresses: result.getValue()!.total_addresses,
          });
          return result;
        }
      }

      // Fallback: construire le résumé à partir de getUserAddresses
      LogUtils.logOperationInfo("getUserAddressSummary", "Using fallback construction", context);
      const addressesResult = await this.getUserAddresses(userId);

      if (addressesResult.isSuccess()) {
        const addresses = addressesResult.getValue()!;
        const shippingAddresses = addresses.filter((a) => a.address_type === "shipping");
        const billingAddresses = addresses.filter((a) => a.address_type === "billing");

        const summary: UserAddressSummary = {
          user_id: userId,
          total_addresses: addresses.length,
          has_default_shipping: shippingAddresses.some((a) => a.is_default),
          has_default_billing: billingAddresses.some((a) => a.is_default),
          shipping_addresses: shippingAddresses,
          billing_addresses: billingAddresses,
        };

        LogUtils.logOperationSuccess("getUserAddressSummary", {
          ...context,
          source: "constructed",
          totalAddresses: summary.total_addresses,
        });
        return Result.success(summary);
      }

      return Result.failure(addressesResult.getError()!);
    } catch (error) {
      LogUtils.logOperationError("getUserAddressSummary", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  // === Opérations de validation ===

  /**
   * Valider une adresse
   */
  async validateAddress(
    addressData: CreateAddressData | UpdateAddressData
  ): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("validateAddress", "address-service");

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("validateAddress", "Using new AddressRepository", context);
        return await this.repository.validateAddressData(addressData);
      }

      // Fallback: validation basique
      LogUtils.logOperationInfo("validateAddress", "Using basic validation", context);
      if (
        "first_name" in addressData &&
        addressData.first_name &&
        addressData.first_name.length < 2
      ) {
        return Result.failure(new Error("First name must be at least 2 characters"));
      }

      LogUtils.logOperationSuccess("validateAddress", { ...context, source: "basic" });
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError("validateAddress", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Normaliser une adresse
   */
  async normalizeAddress(
    addressData: CreateAddressData | UpdateAddressData
  ): Promise<Result<CreateAddressData | UpdateAddressData, Error>> {
    const context = LogUtils.createOperationContext("normalizeAddress", "address-service");

    try {
      if (isRepositoryEnabled("USE_ADDRESS_REPOSITORY")) {
        LogUtils.logOperationInfo("normalizeAddress", "Using new AddressRepository", context);
        return await this.repository.normalizeAddress(addressData);
      }

      // Fallback: pas de normalisation
      LogUtils.logOperationSuccess("normalizeAddress", { ...context, source: "passthrough" });
      return Result.success(addressData);
    } catch (error) {
      LogUtils.logOperationError("normalizeAddress", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }
}

// Instance singleton pour utilisation dans l'application
export const addressService = new AddressService();
