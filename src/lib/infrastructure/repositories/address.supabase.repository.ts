/**
 * Address Repository - Implémentation Supabase
 * 
 * Implémente IAddressRepository en utilisant Supabase comme source de données.
 * Hérite de BaseSupabaseRepository car les adresses sont des tables normales.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Result } from '@/lib/core/result';
import { DatabaseError, ValidationError, NotFoundError, BusinessError } from '@/lib/core/errors';
import { LogUtils } from '@/lib/core/logger';
import { BaseSupabaseRepository } from './base-supabase.repository';
import type { 
  IAddressRepository,
  Address,
  AddressType,
  CreateAddressData,
  UpdateAddressData,
  AddressFilters,
  UserAddressSummary,
  ADDRESS_LIMITS
} from '@/lib/domain/interfaces/address.repository.interface';

export class AddressSupabaseRepository extends BaseSupabaseRepository<Address, CreateAddressData, UpdateAddressData> implements IAddressRepository {
  constructor() {
    super(createSupabaseServerClient(), 'addresses');
  }

  // === Opérations de base par utilisateur ===

  async findByUserId(userId: string, filters?: AddressFilters): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext('findByUserId', 'address-repository');
    LogUtils.logOperationStart('findByUserId', { ...context, userId, filters });

    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (filters?.address_type) {
        query = query.eq('address_type', filters.address_type);
      }
      if (filters?.country_code) {
        query = query.eq('country_code', filters.country_code);
      }
      if (filters?.is_default !== undefined) {
        query = query.eq('is_default', filters.is_default);
      }

      const { data, error } = await query;

      if (error) {
        LogUtils.logOperationError('findByUserId', error, context);
        return Result.failure(new DatabaseError(`Error finding addresses: ${error.message}`));
      }

      LogUtils.logOperationSuccess('findByUserId', { 
        ...context, 
        addressCount: data?.length || 0 
      });
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError('findByUserId', error, context);
      return this.handleError(error);
    }
  }

  async findByUserIdAndType(userId: string, type: AddressType): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext('findByUserIdAndType', 'address-repository');
    LogUtils.logOperationStart('findByUserIdAndType', { ...context, userId, type });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('address_type', type)
        .order('is_default', { ascending: false }) // Adresses par défaut en premier
        .order('created_at', { ascending: false });

      if (error) {
        LogUtils.logOperationError('findByUserIdAndType', error, context);
        return Result.failure(new DatabaseError(`Error finding addresses by type: ${error.message}`));
      }

      LogUtils.logOperationSuccess('findByUserIdAndType', { 
        ...context, 
        addressCount: data?.length || 0 
      });
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError('findByUserIdAndType', error, context);
      return this.handleError(error);
    }
  }

  async findDefaultByType(userId: string, type: AddressType): Promise<Result<Address | null, Error>> {
    const context = LogUtils.createOperationContext('findDefaultByType', 'address-repository');
    LogUtils.logOperationStart('findDefaultByType', { ...context, userId, type });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('address_type', type)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        LogUtils.logOperationError('findDefaultByType', error, context);
        return Result.failure(new DatabaseError(`Error finding default address: ${error.message}`));
      }

      LogUtils.logOperationSuccess('findDefaultByType', { 
        ...context, 
        found: !!data 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('findDefaultByType', error, context);
      return this.handleError(error);
    }
  }

  async getUserAddressSummary(userId: string): Promise<Result<UserAddressSummary, Error>> {
    const context = LogUtils.createOperationContext('getUserAddressSummary', 'address-repository');
    LogUtils.logOperationStart('getUserAddressSummary', { ...context, userId });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('address_type')
        .order('is_default', { ascending: false });

      if (error) {
        LogUtils.logOperationError('getUserAddressSummary', error, context);
        return Result.failure(new DatabaseError(`Error getting address summary: ${error.message}`));
      }

      const addresses = data || [];
      const shippingAddresses = addresses.filter(a => a.address_type === 'shipping');
      const billingAddresses = addresses.filter(a => a.address_type === 'billing');

      const summary: UserAddressSummary = {
        user_id: userId,
        total_addresses: addresses.length,
        has_default_shipping: shippingAddresses.some(a => a.is_default),
        has_default_billing: billingAddresses.some(a => a.is_default),
        shipping_addresses: shippingAddresses,
        billing_addresses: billingAddresses,
      };

      LogUtils.logOperationSuccess('getUserAddressSummary', { 
        ...context, 
        totalAddresses: summary.total_addresses,
        shippingCount: shippingAddresses.length,
        billingCount: billingAddresses.length
      });
      return Result.success(summary);
    } catch (error) {
      LogUtils.logOperationError('getUserAddressSummary', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations CRUD ===

  async createAddress(userId: string, addressData: CreateAddressData): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext('createAddress', 'address-repository');
    LogUtils.logOperationStart('createAddress', { ...context, userId, addressType: addressData.address_type });

    try {
      // Validation des limites
      const limitCheck = await this.hasReachedAddressLimit(userId, addressData.address_type);
      if (limitCheck.isSuccess() && limitCheck.getValue()) {
        return Result.failure(new BusinessError('Address limit reached for this type'));
      }

      // Si c'est la première adresse de ce type, la marquer comme par défaut
      const existingAddresses = await this.findByUserIdAndType(userId, addressData.address_type);
      const isFirstOfType = existingAddresses.isSuccess() && existingAddresses.getValue()!.length === 0;

      const addressToCreate = {
        ...addressData,
        user_id: userId,
        is_default: addressData.is_default ?? isFirstOfType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Si cette adresse doit être par défaut, retirer le statut des autres
      if (addressToCreate.is_default) {
        await this.unsetOtherDefaultsOfType(userId, addressData.address_type);
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(addressToCreate)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('createAddress', error, context);
        return Result.failure(new DatabaseError(`Error creating address: ${error.message}`));
      }

      LogUtils.logOperationSuccess('createAddress', { 
        ...context, 
        addressId: data.id,
        isDefault: data.is_default
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('createAddress', error, context);
      return this.handleError(error);
    }
  }

  async updateAddress(addressId: string, userId: string, addressData: UpdateAddressData): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext('updateAddress', 'address-repository');
    LogUtils.logOperationStart('updateAddress', { ...context, addressId, userId });

    try {
      // Si on met à jour le statut par défaut
      if (addressData.is_default === true) {
        // D'abord récupérer l'adresse pour connaître son type
        const existingResult = await this.findById(addressId);
        if (!existingResult.isSuccess() || !existingResult.getValue()) {
          return Result.failure(new NotFoundError(`Address ${addressId} not found`));
        }

        const existingAddress = existingResult.getValue()!;
        if (existingAddress.user_id !== userId) {
          return Result.failure(new BusinessError('Address does not belong to this user'));
        }

        // Retirer le statut par défaut des autres adresses du même type
        await this.unsetOtherDefaultsOfType(userId, existingAddress.address_type, addressId);
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          ...addressData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', addressId)
        .eq('user_id', userId) // Security: vérifier que l'adresse appartient à l'utilisateur
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('updateAddress', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Address ${addressId} not found for user ${userId}`));
        }
        return Result.failure(new DatabaseError(`Error updating address: ${error.message}`));
      }

      LogUtils.logOperationSuccess('updateAddress', { 
        ...context, 
        addressId: data.id 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('updateAddress', error, context);
      return this.handleError(error);
    }
  }

  async deleteAddress(addressId: string, userId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('deleteAddress', 'address-repository');
    LogUtils.logOperationStart('deleteAddress', { ...context, addressId, userId });

    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId); // Security: vérifier que l'adresse appartient à l'utilisateur

      if (error) {
        LogUtils.logOperationError('deleteAddress', error, context);
        return Result.failure(new DatabaseError(`Error deleting address: ${error.message}`));
      }

      LogUtils.logOperationSuccess('deleteAddress', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('deleteAddress', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de gestion des adresses par défaut ===

  async setAsDefault(addressId: string, userId: string, type: AddressType): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext('setAsDefault', 'address-repository');
    LogUtils.logOperationStart('setAsDefault', { ...context, addressId, userId, type });

    try {
      // D'abord retirer le statut par défaut des autres adresses du même type
      await this.unsetOtherDefaultsOfType(userId, type, addressId);

      // Puis mettre cette adresse comme par défaut
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', addressId)
        .eq('user_id', userId)
        .eq('address_type', type)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('setAsDefault', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Address ${addressId} not found for user ${userId}`));
        }
        return Result.failure(new DatabaseError(`Error setting address as default: ${error.message}`));
      }

      LogUtils.logOperationSuccess('setAsDefault', { 
        ...context, 
        addressId: data.id 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('setAsDefault', error, context);
      return this.handleError(error);
    }
  }

  async unsetAsDefault(addressId: string, userId: string): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext('unsetAsDefault', 'address-repository');
    LogUtils.logOperationStart('unsetAsDefault', { ...context, addressId, userId });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('unsetAsDefault', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Address ${addressId} not found for user ${userId}`));
        }
        return Result.failure(new DatabaseError(`Error unsetting address as default: ${error.message}`));
      }

      LogUtils.logOperationSuccess('unsetAsDefault', { 
        ...context, 
        addressId: data.id 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('unsetAsDefault', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de validation ===

  async validateAddressData(addressData: CreateAddressData | UpdateAddressData): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('validateAddressData', 'address-repository');

    try {
      // Validation basique
      if ('first_name' in addressData && addressData.first_name && addressData.first_name.length < 2) {
        return Result.failure(new ValidationError('First name must be at least 2 characters'));
      }

      if ('last_name' in addressData && addressData.last_name && addressData.last_name.length < 2) {
        return Result.failure(new ValidationError('Last name must be at least 2 characters'));
      }

      if ('postal_code' in addressData && addressData.postal_code && addressData.country_code) {
        const postalCodeValid = await this.validatePostalCodeFormat(addressData.postal_code, addressData.country_code);
        if (!postalCodeValid.isSuccess() || !postalCodeValid.getValue()) {
          return Result.failure(new ValidationError('Invalid postal code format for this country'));
        }
      }

      LogUtils.logOperationSuccess('validateAddressData', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('validateAddressData', error, context);
      return this.handleError(error);
    }
  }

  async validatePostalCodeFormat(postalCode: string, countryCode: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('validatePostalCodeFormat', 'address-repository');

    try {
      // Validation basique par pays (peut être étendue)
      const patterns: Record<string, RegExp> = {
        'FR': /^\d{5}$/, // France: 5 chiffres
        'US': /^\d{5}(-\d{4})?$/, // USA: 5 chiffres ou 5-4
        'CA': /^[A-Z]\d[A-Z] \d[A-Z]\d$/, // Canada: A1A 1A1
        'GB': /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, // UK: SW1A 1AA
        'DE': /^\d{5}$/, // Allemagne: 5 chiffres
        'ES': /^\d{5}$/, // Espagne: 5 chiffres
      };

      const pattern = patterns[countryCode.toUpperCase()];
      if (!pattern) {
        // Si pas de pattern défini, accepter (validation basique)
        LogUtils.logOperationSuccess('validatePostalCodeFormat', { 
          ...context, 
          countryCode, 
          validated: false, 
          result: true 
        });
        return Result.success(true);
      }

      const isValid = pattern.test(postalCode);
      LogUtils.logOperationSuccess('validatePostalCodeFormat', { 
        ...context, 
        countryCode, 
        validated: true, 
        result: isValid 
      });
      return Result.success(isValid);
    } catch (error) {
      LogUtils.logOperationError('validatePostalCodeFormat', error, context);
      return this.handleError(error);
    }
  }

  async normalizeAddress(addressData: CreateAddressData | UpdateAddressData): Promise<Result<CreateAddressData | UpdateAddressData, Error>> {
    const context = LogUtils.createOperationContext('normalizeAddress', 'address-repository');

    try {
      const normalized = { ...addressData };

      // Normalisation des noms (première lettre majuscule)
      if (normalized.first_name) {
        normalized.first_name = this.capitalizeFirstLetter(normalized.first_name.trim());
      }
      if (normalized.last_name) {
        normalized.last_name = this.capitalizeFirstLetter(normalized.last_name.trim());
      }
      if (normalized.city) {
        normalized.city = this.capitalizeFirstLetter(normalized.city.trim());
      }

      // Normalisation du code pays (majuscules)
      if (normalized.country_code) {
        normalized.country_code = normalized.country_code.toUpperCase();
      }

      // Normalisation du code postal (suppression des espaces pour certains pays)
      if (normalized.postal_code && normalized.country_code) {
        normalized.postal_code = this.normalizePostalCode(normalized.postal_code, normalized.country_code);
      }

      LogUtils.logOperationSuccess('normalizeAddress', context);
      return Result.success(normalized);
    } catch (error) {
      LogUtils.logOperationError('normalizeAddress', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de recherche ===

  async searchAddressesByUser(userId: string, searchTerm: string, filters?: AddressFilters): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext('searchAddressesByUser', 'address-repository');
    LogUtils.logOperationStart('searchAddressesByUser', { ...context, userId, searchTerm });

    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      // Recherche full-text basique
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      query = query.or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},city.ilike.${searchPattern},address_line1.ilike.${searchPattern}`);

      // Appliquer les filtres
      if (filters?.address_type) {
        query = query.eq('address_type', filters.address_type);
      }
      if (filters?.country_code) {
        query = query.eq('country_code', filters.country_code);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        LogUtils.logOperationError('searchAddressesByUser', error, context);
        return Result.failure(new DatabaseError(`Error searching addresses: ${error.message}`));
      }

      LogUtils.logOperationSuccess('searchAddressesByUser', { 
        ...context, 
        resultCount: data?.length || 0 
      });
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError('searchAddressesByUser', error, context);
      return this.handleError(error);
    }
  }

  async findRecentlyUsedAddresses(userId: string, limit = 5): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext('findRecentlyUsedAddresses', 'address-repository');
    LogUtils.logOperationStart('findRecentlyUsedAddresses', { ...context, userId, limit });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        LogUtils.logOperationError('findRecentlyUsedAddresses', error, context);
        return Result.failure(new DatabaseError(`Error finding recent addresses: ${error.message}`));
      }

      LogUtils.logOperationSuccess('findRecentlyUsedAddresses', { 
        ...context, 
        addressCount: data?.length || 0 
      });
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError('findRecentlyUsedAddresses', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de duplication ===

  async findSimilarAddresses(userId: string, addressData: CreateAddressData): Promise<Result<Address[], Error>> {
    const context = LogUtils.createOperationContext('findSimilarAddresses', 'address-repository');
    LogUtils.logOperationStart('findSimilarAddresses', { ...context, userId });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('address_line1', addressData.address_line1)
        .eq('postal_code', addressData.postal_code)
        .eq('city', addressData.city)
        .eq('country_code', addressData.country_code);

      if (error) {
        LogUtils.logOperationError('findSimilarAddresses', error, context);
        return Result.failure(new DatabaseError(`Error finding similar addresses: ${error.message}`));
      }

      LogUtils.logOperationSuccess('findSimilarAddresses', { 
        ...context, 
        similarCount: data?.length || 0 
      });
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError('findSimilarAddresses', error, context);
      return this.handleError(error);
    }
  }

  async duplicateAddress(addressId: string, userId: string, newType: AddressType): Promise<Result<Address, Error>> {
    const context = LogUtils.createOperationContext('duplicateAddress', 'address-repository');
    LogUtils.logOperationStart('duplicateAddress', { ...context, addressId, userId, newType });

    try {
      // D'abord récupérer l'adresse originale
      const originalResult = await this.findById(addressId);
      if (!originalResult.isSuccess() || !originalResult.getValue()) {
        return Result.failure(new NotFoundError(`Address ${addressId} not found`));
      }

      const original = originalResult.getValue()!;
      if (original.user_id !== userId) {
        return Result.failure(new BusinessError('Address does not belong to this user'));
      }

      // Créer les données pour la nouvelle adresse
      const newAddressData: CreateAddressData = {
        address_type: newType,
        company_name: original.company_name,
        first_name: original.first_name,
        last_name: original.last_name,
        email: original.email,
        street_number: original.street_number,
        address_line1: original.address_line1,
        address_line2: original.address_line2,
        postal_code: original.postal_code,
        city: original.city,
        country_code: original.country_code,
        state_province_region: original.state_province_region,
        phone_number: original.phone_number,
        is_default: false, // La nouvelle adresse n'est pas par défaut
      };

      // Créer la nouvelle adresse
      const result = await this.createAddress(userId, newAddressData);

      if (result.isSuccess()) {
        LogUtils.logOperationSuccess('duplicateAddress', { 
          ...context, 
          newAddressId: result.getValue()!.id 
        });
      }

      return result;
    } catch (error) {
      LogUtils.logOperationError('duplicateAddress', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations utilitaires ===

  async countAddressesByUser(userId: string, type?: AddressType): Promise<Result<number, Error>> {
    const context = LogUtils.createOperationContext('countAddressesByUser', 'address-repository');
    LogUtils.logOperationStart('countAddressesByUser', { ...context, userId, type });

    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (type) {
        query = query.eq('address_type', type);
      }

      const { count, error } = await query;

      if (error) {
        LogUtils.logOperationError('countAddressesByUser', error, context);
        return Result.failure(new DatabaseError(`Error counting addresses: ${error.message}`));
      }

      LogUtils.logOperationSuccess('countAddressesByUser', { 
        ...context, 
        count: count || 0 
      });
      return Result.success(count || 0);
    } catch (error) {
      LogUtils.logOperationError('countAddressesByUser', error, context);
      return this.handleError(error);
    }
  }

  async hasReachedAddressLimit(userId: string, type?: AddressType): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('hasReachedAddressLimit', 'address-repository');
    LogUtils.logOperationStart('hasReachedAddressLimit', { ...context, userId, type });

    try {
      const countResult = await this.countAddressesByUser(userId, type);
      if (!countResult.isSuccess()) {
        return countResult;
      }

      const count = countResult.getValue()!;
      const limit = type ? 5 : 10; // ADDRESS_LIMITS constants

      const hasReached = count >= limit;
      LogUtils.logOperationSuccess('hasReachedAddressLimit', { 
        ...context, 
        count, 
        limit, 
        hasReached 
      });
      return Result.success(hasReached);
    } catch (error) {
      LogUtils.logOperationError('hasReachedAddressLimit', error, context);
      return this.handleError(error);
    }
  }

  async formatAddressForDisplay(address: Address): Promise<Result<string, Error>> {
    const context = LogUtils.createOperationContext('formatAddressForDisplay', 'address-repository');

    try {
      const lines: string[] = [];

      // Nom complet
      const fullName = `${address.first_name} ${address.last_name}`.trim();
      if (fullName) lines.push(fullName);

      // Société
      if (address.company_name) lines.push(address.company_name);

      // Adresse ligne 1
      const addressLine1 = [address.street_number, address.address_line1].filter(Boolean).join(' ');
      if (addressLine1) lines.push(addressLine1);

      // Adresse ligne 2
      if (address.address_line2) lines.push(address.address_line2);

      // Ville, code postal
      const cityLine = `${address.postal_code} ${address.city}`.trim();
      if (cityLine) lines.push(cityLine);

      // État/Province (si présent)
      if (address.state_province_region) lines.push(address.state_province_region);

      // Pays
      lines.push(address.country_code);

      const formatted = lines.join('\n');
      LogUtils.logOperationSuccess('formatAddressForDisplay', context);
      return Result.success(formatted);
    } catch (error) {
      LogUtils.logOperationError('formatAddressForDisplay', error, context);
      return this.handleError(error);
    }
  }

  async validateAddressWithExternalService(address: Address): Promise<Result<{ isValid: boolean; suggestions?: Address[] }, Error>> {
    const context = LogUtils.createOperationContext('validateAddressWithExternalService', 'address-repository');

    try {
      // Pour l'instant, implémentation simplifiée
      // Dans une vraie implémentation, on appellerait un service externe comme Google Maps API
      LogUtils.logOperationSuccess('validateAddressWithExternalService', { 
        ...context, 
        isValid: true, 
        external: false 
      });
      return Result.success({ isValid: true });
    } catch (error) {
      LogUtils.logOperationError('validateAddressWithExternalService', error, context);
      return this.handleError(error);
    }
  }

  // === Méthodes utilitaires privées ===

  private async unsetOtherDefaultsOfType(userId: string, type: AddressType, excludeAddressId?: string): Promise<void> {
    let query = this.supabase
      .from(this.tableName)
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('address_type', type)
      .eq('is_default', true);

    if (excludeAddressId) {
      query = query.neq('id', excludeAddressId);
    }

    await query;
  }

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private normalizePostalCode(postalCode: string, countryCode: string): string {
    switch (countryCode.toUpperCase()) {
      case 'CA':
        // Canada: Assurer le format A1A 1A1
        return postalCode.replace(/\s/g, '').replace(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/, '$1 $2');
      case 'GB':
        // UK: Assurer l'espace avant les 2 derniers caractères
        return postalCode.replace(/\s/g, '').replace(/^(.+)([A-Z]{2})$/, '$1 $2');
      default:
        return postalCode.trim();
    }
  }
}