/**
 * User Service - Couche d'intégration avec migration progressive
 *
 * Cette couche utilise les feature flags pour décider entre l'ancien système
 * (profileActions/userActions) et le nouveau UserRepository.
 *
 * Pattern "Strangler Fig" : remplace progressivement l'ancien code.
 */

import { Result } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { isRepositoryEnabled } from "@/lib/config/feature-flags";
import { UserSupabaseRepository } from "@/lib/infrastructure/repositories/user.supabase.repository";
import type {
  IUserRepository,
  User,
  Profile,
  UserWithProfile,
  CreateProfileData,
  UpdateProfileData,
  AdminUserData,
} from "@/lib/domain/interfaces/user.repository.interface";

// Import des anciennes fonctions (fallback)
// Note: These legacy imports are commented out due to missing exports
// import { getProfile } from '@/actions/profileActions';
import { getUsers } from "@/actions/userActions";
// import { updateUserRole } from '@/actions/userActions';

export class UserService {
  private repository: IUserRepository;

  constructor() {
    this.repository = new UserSupabaseRepository();
  }

  // === Opérations Profile ===

  /**
   * Obtenir le profil d'un utilisateur
   * Utilise le nouveau repository si activé, sinon fallback vers profileActions
   */
  async getUserProfile(userId: string): Promise<Result<Profile | null, Error>> {
    const context = LogUtils.createUserActionContext(userId, "getUserProfile", "profile");
    LogUtils.logOperationStart("getUserProfile", { ...context, userId });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("getUserProfile", context);
        const result = await this.repository.findProfileByUserId(userId);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("getUserProfile", {
            ...context,
            source: "repository",
            found: !!result.getValue(),
          });
          return result;
        }

        // Si le repository échoue, fallback vers l'ancien système
        LogUtils.logOperationError(
          "getUserProfile",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // Fallback vers l'ancien système
      // Legacy getProfile not available, return failure
      LogUtils.logOperationError(
        "getUserProfile",
        new Error("Legacy getProfile function not available"),
        context
      );
      return Result.failure(new Error("Legacy getProfile function not available"));
    } catch (error) {
      LogUtils.logOperationError("getUserProfile", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Mettre à jour le profil d'un utilisateur
   */
  async updateUserProfile(
    userId: string,
    profileData: UpdateProfileData
  ): Promise<Result<Profile, Error>> {
    const context = LogUtils.createUserActionContext(userId, "updateUserProfile", "profile");
    LogUtils.logOperationStart("updateUserProfile", { ...context, userId });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("updateUserProfile", context);
        const result = await this.repository.updateProfile(userId, profileData);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("updateUserProfile", {
            ...context,
            source: "repository",
          });
          return result;
        }

        LogUtils.logOperationError(
          "updateUserProfile",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // TODO: Implémenter fallback vers profileActions
      // Pour l'instant, on retourne une erreur si le repository n'est pas disponible
      LogUtils.logOperationError("updateUserProfile", "Legacy fallback not implemented", context);
      return Result.failure(new Error("Legacy fallback not implemented for updateUserProfile"));
    } catch (error) {
      LogUtils.logOperationError("updateUserProfile", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Créer un profil pour un utilisateur
   */
  async createUserProfile(
    userId: string,
    profileData: CreateProfileData
  ): Promise<Result<Profile, Error>> {
    const context = LogUtils.createUserActionContext(userId, "createUserProfile", "profile");
    LogUtils.logOperationStart("createUserProfile", { ...context, userId });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("createUserProfile", context);
        const result = await this.repository.createProfile(userId, profileData);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("createUserProfile", {
            ...context,
            source: "repository",
          });
          return result;
        }

        LogUtils.logOperationError(
          "createUserProfile",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // TODO: Implémenter fallback vers profileActions
      LogUtils.logOperationError("createUserProfile", "Legacy fallback not implemented", context);
      return Result.failure(new Error("Legacy fallback not implemented for createUserProfile"));
    } catch (error) {
      LogUtils.logOperationError("createUserProfile", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  // === Opérations Admin ===

  /**
   * Obtenir tous les utilisateurs (pour admin)
   */
  async getAllUsers(
    page = 1,
    limit = 20
  ): Promise<Result<{ users: AdminUserData[]; total: number }, Error>> {
    const context = LogUtils.createUserActionContext("system", "getAllUsers", "users");
    LogUtils.logOperationStart("getAllUsers", { ...context, page, limit });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("getAllUsers", context);
        const result = await this.repository.findAllWithProfiles(page, limit);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("getAllUsers", {
            ...context,
            source: "repository",
            count: result.getValue()!.users.length,
          });
          return result;
        }

        LogUtils.logOperationError(
          "getAllUsers",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationSuccess("getAllUsers", context);
      const legacyResult = await getUsers();

      if (legacyResult.success && legacyResult.data) {
        const users = legacyResult.data.map((user: any) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          profile: user.profile || {
            id: "",
            user_id: user.id,
            first_name: null,
            last_name: null,
            phone: null,
            avatar_url: null,
            is_admin: false,
            marketing_consent: false,
            created_at: user.created_at,
            updated_at: user.created_at,
          },
        }));

        LogUtils.logOperationSuccess("getAllUsers", {
          ...context,
          source: "legacy",
          count: users.length,
        });
        return Result.success({ users, total: users.length });
      }

      LogUtils.logOperationError("getAllUsers", "Legacy getAllUsers failed", context);
      return Result.failure(new Error("Failed to get users from legacy system"));
    } catch (error) {
      LogUtils.logOperationError("getAllUsers", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Vérifier les droits admin d'un utilisateur
   */
  async checkAdminRole(userId: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createUserActionContext(userId, "checkAdminRole", "admin");
    LogUtils.logOperationStart("checkAdminRole", { ...context, userId });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("checkAdminRole", context);
        const result = await this.repository.checkAdminRole(userId);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("checkAdminRole", {
            ...context,
            source: "repository",
            isAdmin: result.getValue(),
          });
          return result;
        }

        LogUtils.logOperationError(
          "checkAdminRole",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // TODO: Implémenter fallback vers userActions/checkAdminRole
      LogUtils.logOperationError("checkAdminRole", "Legacy fallback not implemented", context);
      return Result.failure(new Error("Legacy fallback not implemented for checkAdminRole"));
    } catch (error) {
      LogUtils.logOperationError("checkAdminRole", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  /**
   * Mettre à jour le statut admin d'un utilisateur
   */
  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<Result<Profile, Error>> {
    const context = LogUtils.createUserActionContext(userId, "updateAdminStatus", "admin");
    LogUtils.logOperationStart("updateAdminStatus", { ...context, userId, isAdmin });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("updateAdminStatus", context);
        const result = await this.repository.updateAdminStatus(userId, isAdmin);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("updateAdminStatus", {
            ...context,
            source: "repository",
          });
          return result;
        }

        LogUtils.logOperationError(
          "updateAdminStatus",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // Fallback vers l'ancien système
      // Legacy updateUserRole not available, return failure
      LogUtils.logOperationError(
        "updateAdminStatus",
        new Error("Legacy updateUserRole function not available"),
        context
      );
      return Result.failure(new Error("Legacy updateUserRole function not available"));
    } catch (error) {
      LogUtils.logOperationError("updateAdminStatus", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  // === Opérations de recherche ===

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(
    searchTerm: string,
    page = 1,
    limit = 20
  ): Promise<Result<{ users: AdminUserData[]; total: number }, Error>> {
    const context = LogUtils.createUserActionContext("system", "searchUsers", "users");
    LogUtils.logOperationStart("searchUsers", { ...context, searchTerm, page, limit });

    try {
      if (isRepositoryEnabled("USE_USER_REPOSITORY")) {
        LogUtils.logOperationSuccess("searchUsers", context);
        const result = await this.repository.searchUsers(searchTerm, page, limit);

        if (result.isSuccess()) {
          LogUtils.logOperationSuccess("searchUsers", {
            ...context,
            source: "repository",
            count: result.getValue()!.users.length,
          });
          return result;
        }

        LogUtils.logOperationError(
          "searchUsers",
          new Error("Repository failed, falling back to legacy"),
          context
        );
      }

      // Fallback: utiliser getAllUsers et filtrer côté client (simple)
      LogUtils.logOperationSuccess("searchUsers", context);
      const allUsersResult = await this.getAllUsers(page, limit);

      if (allUsersResult.isSuccess()) {
        const { users, total } = allUsersResult.getValue()!;
        const filteredUsers = users.filter(
          (user) =>
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.profile.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.profile.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        LogUtils.logOperationSuccess("searchUsers", {
          ...context,
          source: "legacy-filtered",
          count: filteredUsers.length,
        });
        return Result.success({ users: filteredUsers, total: filteredUsers.length });
      }

      return allUsersResult;
    } catch (error) {
      LogUtils.logOperationError("searchUsers", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Unknown error"));
    }
  }
}

// Instance singleton pour utilisation dans l'application
export const userService = new UserService();
