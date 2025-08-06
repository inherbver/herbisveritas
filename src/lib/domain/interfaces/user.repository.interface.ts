/**
 * User Repository Interface
 *
 * Centralise toutes les opérations liées aux utilisateurs et profils.
 * Remplace progressivement les opérations dans profileActions et userActions.
 */

import { Result } from "@/lib/core/result";

// Types pour les entités User
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "user" | "editor" | "admin" | "dev";
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile extends User {
  profile?: Profile;
}

// Types pour les opérations CRUD
export interface CreateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  marketing_consent?: boolean;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  marketing_consent?: boolean;
}

export interface AdminUserData {
  id: string;
  email: string;
  profile: Profile;
  created_at: string;
  last_sign_in_at?: string;
}

/**
 * Interface du Repository User
 *
 * Couvre toutes les opérations nécessaires pour la gestion des utilisateurs
 * et profils dans l'application e-commerce.
 */
export interface IUserRepository {
  // === Opérations de base utilisateur ===

  /**
   * Trouve un utilisateur par email
   */
  findByEmail(email: string): Promise<Result<User | null, Error>>;

  /**
   * Trouve un utilisateur avec son profil
   */
  findByIdWithProfile(id: string): Promise<Result<UserWithProfile | null, Error>>;

  /**
   * Trouve plusieurs utilisateurs avec leurs profils (pour admin)
   */
  findAllWithProfiles(
    page?: number,
    limit?: number
  ): Promise<Result<{ users: AdminUserData[]; total: number }, Error>>;

  // === Opérations profil ===

  /**
   * Crée un profil pour un utilisateur
   */
  createProfile(userId: string, profileData: CreateProfileData): Promise<Result<Profile, Error>>;

  /**
   * Met à jour le profil d'un utilisateur
   */
  updateProfile(userId: string, profileData: UpdateProfileData): Promise<Result<Profile, Error>>;

  /**
   * Trouve le profil d'un utilisateur
   */
  findProfileByUserId(userId: string): Promise<Result<Profile | null, Error>>;

  // === Opérations admin ===

  /**
   * Vérifie si un utilisateur a les droits admin
   */
  checkAdminRole(userId: string): Promise<Result<boolean, Error>>;

  /**
   * Met à jour le rôle d'un utilisateur
   */
  updateUserRole(
    userId: string,
    role: "user" | "editor" | "admin" | "dev"
  ): Promise<Result<Profile, Error>>;

  /**
   * Met à jour le statut admin d'un utilisateur
   */
  updateAdminStatus(userId: string, isAdmin: boolean): Promise<Result<Profile, Error>>;

  /**
   * Supprime un utilisateur et son profil (soft delete)
   */
  deleteUser(userId: string): Promise<Result<void, Error>>;

  // === Opérations de recherche ===

  /**
   * Recherche d'utilisateurs par terme (email, nom, prénom)
   */
  searchUsers(
    searchTerm: string,
    page?: number,
    limit?: number
  ): Promise<Result<{ users: AdminUserData[]; total: number }, Error>>;

  /**
   * Trouve les utilisateurs admin
   */
  findAdminUsers(): Promise<Result<AdminUserData[], Error>>;

  // === Opérations de validation ===

  /**
   * Valide les données d'un profil avant création/mise à jour
   */
  validateProfileData(
    profileData: CreateProfileData | UpdateProfileData
  ): Promise<Result<void, Error>>;

  /**
   * Vérifie si un email est déjà utilisé
   */
  isEmailTaken(email: string, excludeUserId?: string): Promise<Result<boolean, Error>>;
}

/**
 * Repository Service Token pour le Container DI
 */
export const USER_REPOSITORY_TOKEN = "UserRepository" as const;
