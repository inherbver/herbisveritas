/**
 * Address Repository Interface
 * 
 * Centralise toutes les opérations liées aux adresses utilisateur.
 * Remplace progressivement les opérations dans addressActions.
 */

import { Result } from '@/lib/core/result';
import { Repository } from './repository.interface';

// Types pour les entités Address
export type AddressType = 'shipping' | 'billing';

export interface Address {
  id: string;
  user_id: string;
  address_type: AddressType;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  street_number: string | null;
  address_line1: string;
  address_line2: string | null;
  postal_code: string;
  city: string;
  country_code: string;
  state_province_region: string | null;
  phone_number: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Types pour les opérations CRUD
export interface CreateAddressData {
  address_type: AddressType;
  company_name?: string | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  street_number?: string | null;
  address_line1: string;
  address_line2?: string | null;
  postal_code: string;
  city: string;
  country_code: string;
  state_province_region?: string | null;
  phone_number?: string | null;
  is_default?: boolean;
}

export interface UpdateAddressData {
  address_type?: AddressType;
  company_name?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  street_number?: string | null;
  address_line1?: string;
  address_line2?: string | null;
  postal_code?: string;
  city?: string;
  country_code?: string;
  state_province_region?: string | null;
  phone_number?: string | null;
  is_default?: boolean;
}

// Types pour les filtres et recherches
export interface AddressFilters {
  address_type?: AddressType;
  country_code?: string;
  is_default?: boolean;
}

export interface UserAddressSummary {
  user_id: string;
  total_addresses: number;
  has_default_shipping: boolean;
  has_default_billing: boolean;
  shipping_addresses: Address[];
  billing_addresses: Address[];
}

/**
 * Interface du Repository Address
 * 
 * Couvre toutes les opérations nécessaires pour la gestion des adresses
 * dans l'application e-commerce.
 */
export interface IAddressRepository extends Repository<Address> {
  // === Opérations de base par utilisateur ===
  
  /**
   * Trouve toutes les adresses d'un utilisateur
   */
  findByUserId(userId: string, filters?: AddressFilters): Promise<Result<Address[], Error>>;
  
  /**
   * Trouve une adresse par type pour un utilisateur
   */
  findByUserIdAndType(userId: string, type: AddressType): Promise<Result<Address[], Error>>;
  
  /**
   * Trouve l'adresse par défaut d'un type pour un utilisateur
   */
  findDefaultByType(userId: string, type: AddressType): Promise<Result<Address | null, Error>>;
  
  /**
   * Obtient un résumé des adresses d'un utilisateur
   */
  getUserAddressSummary(userId: string): Promise<Result<UserAddressSummary, Error>>;
  
  // === Opérations CRUD ===
  
  /**
   * Crée une nouvelle adresse pour un utilisateur
   */
  createAddress(userId: string, addressData: CreateAddressData): Promise<Result<Address, Error>>;
  
  /**
   * Met à jour une adresse existante
   */
  updateAddress(addressId: string, userId: string, addressData: UpdateAddressData): Promise<Result<Address, Error>>;
  
  /**
   * Supprime une adresse
   */
  deleteAddress(addressId: string, userId: string): Promise<Result<void, Error>>;
  
  // === Opérations de gestion des adresses par défaut ===
  
  /**
   * Définit une adresse comme adresse par défaut d'un type
   * (et retire le statut par défaut des autres adresses du même type)
   */
  setAsDefault(addressId: string, userId: string, type: AddressType): Promise<Result<Address, Error>>;
  
  /**
   * Retire le statut par défaut d'une adresse
   */
  unsetAsDefault(addressId: string, userId: string): Promise<Result<Address, Error>>;
  
  // === Opérations de validation ===
  
  /**
   * Valide les données d'une adresse avant création/mise à jour
   */
  validateAddressData(addressData: CreateAddressData | UpdateAddressData): Promise<Result<void, Error>>;
  
  /**
   * Valide le format d'un code postal pour un pays donné
   */
  validatePostalCodeFormat(postalCode: string, countryCode: string): Promise<Result<boolean, Error>>;
  
  /**
   * Normalise une adresse (formatage, capitalisation, etc.)
   */
  normalizeAddress(addressData: CreateAddressData | UpdateAddressData): Promise<Result<CreateAddressData | UpdateAddressData, Error>>;
  
  // === Opérations de recherche ===
  
  /**
   * Recherche d'adresses par termes (nom, ville, etc.)
   */
  searchAddressesByUser(
    userId: string, 
    searchTerm: string, 
    filters?: AddressFilters
  ): Promise<Result<Address[], Error>>;
  
  /**
   * Trouve les adresses récemment utilisées
   */
  findRecentlyUsedAddresses(userId: string, limit?: number): Promise<Result<Address[], Error>>;
  
  // === Opérations de duplication ===
  
  /**
   * Vérifie si une adresse similaire existe déjà
   */
  findSimilarAddresses(userId: string, addressData: CreateAddressData): Promise<Result<Address[], Error>>;
  
  /**
   * Duplique une adresse existante avec un nouveau type
   */
  duplicateAddress(addressId: string, userId: string, newType: AddressType): Promise<Result<Address, Error>>;
  
  // === Opérations utilitaires ===
  
  /**
   * Compte le nombre d'adresses par utilisateur
   */
  countAddressesByUser(userId: string, type?: AddressType): Promise<Result<number, Error>>;
  
  /**
   * Vérifie si un utilisateur a atteint la limite d'adresses
   */
  hasReachedAddressLimit(userId: string, type?: AddressType): Promise<Result<boolean, Error>>;
  
  /**
   * Formate une adresse pour l'affichage (texte multi-ligne)
   */
  formatAddressForDisplay(address: Address): Promise<Result<string, Error>>;
  
  /**
   * Valide une adresse via un service externe (optionnel)
   */
  validateAddressWithExternalService(address: Address): Promise<Result<{ isValid: boolean; suggestions?: Address[] }, Error>>;
}

/**
 * Repository Service Token pour le Container DI
 */
export const ADDRESS_REPOSITORY_TOKEN = 'AddressRepository' as const;

/**
 * Configuration des limites d'adresses
 */
export const ADDRESS_LIMITS = {
  MAX_ADDRESSES_PER_USER: 10,
  MAX_ADDRESSES_PER_TYPE: 5,
} as const;