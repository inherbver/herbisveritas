/**
 * User Service - Couche d'intégration avec migration progressive
 * 
 * Cette couche utilise les feature flags pour décider entre l'ancien système
 * (profileActions/userActions) et le nouveau UserRepository.
 * 
 * Pattern "Strangler Fig" : remplace progressivement l'ancien code.
 */

import { Result } from '@/lib/core/result';
import { LogUtils } from '@/lib/core/logger';
import { isRepositoryEnabled } from '@/lib/config/feature-flags';
import { UserSupabaseRepository } from '@/lib/infrastructure/repositories/user.supabase.repository';
import type { 
  IUserRepository,
  User,
  Profile,
  UserWithProfile,
  CreateProfileData,
  UpdateProfileData,
  AdminUserData
} from '@/lib/domain/interfaces/user.repository.interface';

// Import des anciennes fonctions (fallback)
import { getProfile } from '@/actions/profileActions';
import { getUsers, updateUserRole, type UserForAdminPanel } from '@/actions/userActions';

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
    const context = LogUtils.createOperationContext('getUserProfile', 'user-service');
    LogUtils.logOperationStart('getUserProfile', { ...context, userId });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('getUserProfile', 'Using new UserRepository', context);
        const result = await this.repository.findProfileByUserId(userId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getUserProfile', { 
            ...context, 
            source: 'repository', 
            found: !!result.getValue() 
          });
          return result;
        }

        // Si le repository échoue, fallback vers l'ancien système
        LogUtils.logOperationWarning('getUserProfile', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getUserProfile', 'Using legacy profileActions', context);
      const legacyResult = await getProfile();
      
      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess('getUserProfile', { 
          ...context, 
          source: 'legacy', 
          found: true 
        });
        return Result.success(legacyResult.data);
      }

      LogUtils.logOperationSuccess('getUserProfile', { 
        ...context, 
        source: 'legacy', 
        found: false 
      });
      return Result.success(null);

    } catch (error) {
      LogUtils.logOperationError('getUserProfile', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour le profil d'un utilisateur
   */
  async updateUserProfile(userId: string, profileData: UpdateProfileData): Promise<Result<Profile, Error>> {
    const context = LogUtils.createOperationContext('updateUserProfile', 'user-service');
    LogUtils.logOperationStart('updateUserProfile', { ...context, userId });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('updateUserProfile', 'Using new UserRepository', context);
        const result = await this.repository.updateProfile(userId, profileData);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateUserProfile', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('updateUserProfile', 'Repository failed, falling back to legacy', context);
      }

      // TODO: Implémenter fallback vers profileActions
      // Pour l'instant, on retourne une erreur si le repository n'est pas disponible
      LogUtils.logOperationError('updateUserProfile', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for updateUserProfile'));

    } catch (error) {
      LogUtils.logOperationError('updateUserProfile', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Créer un profil pour un utilisateur
   */
  async createUserProfile(userId: string, profileData: CreateProfileData): Promise<Result<Profile, Error>> {
    const context = LogUtils.createOperationContext('createUserProfile', 'user-service');
    LogUtils.logOperationStart('createUserProfile', { ...context, userId });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('createUserProfile', 'Using new UserRepository', context);
        const result = await this.repository.createProfile(userId, profileData);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('createUserProfile', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('createUserProfile', 'Repository failed, falling back to legacy', context);
      }

      // TODO: Implémenter fallback vers profileActions
      LogUtils.logOperationError('createUserProfile', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for createUserProfile'));

    } catch (error) {
      LogUtils.logOperationError('createUserProfile', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations Admin ===

  /**
   * Obtenir tous les utilisateurs (pour admin)
   */
  async getAllUsers(page = 1, limit = 20): Promise<Result<{ users: AdminUserData[]; total: number }, Error>> {
    const context = LogUtils.createOperationContext('getAllUsers', 'user-service');
    LogUtils.logOperationStart('getAllUsers', { ...context, page, limit });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('getAllUsers', 'Using new UserRepository', context);
        const result = await this.repository.findAllWithProfiles(page, limit);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getAllUsers', { 
            ...context, 
            source: 'repository',
            count: result.getValue()!.users.length
          });
          return result;
        }

        LogUtils.logOperationWarning('getAllUsers', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getAllUsers', 'Using legacy userActions', context);
      const legacyResult = await getUsers();
      
      if (legacyResult.success && legacyResult.data) {
        const users = legacyResult.data.map((user: UserForAdminPanel) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          profile: {
            id: user.id,
            user_id: user.id,
            first_name: user.full_name?.split(' ')[0] || null,
            last_name: user.full_name?.split(' ').slice(1).join(' ') || null,
            phone: null,
            avatar_url: null,
            is_admin: user.role === 'admin',
            marketing_consent: false,
            created_at: user.created_at,
            updated_at: user.created_at,
          }
        }));

        LogUtils.logOperationSuccess('getAllUsers', { 
          ...context, 
          source: 'legacy',
          count: users.length
        });
        return Result.success({ users, total: users.length });
      }

      LogUtils.logOperationError('getAllUsers', 'Legacy getAllUsers failed', context);
      return Result.failure(new Error('Failed to get users from legacy system'));

    } catch (error) {
      LogUtils.logOperationError('getAllUsers', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Vérifier les droits admin d'un utilisateur
   */
  async checkAdminRole(userId: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('checkAdminRole', 'user-service');
    LogUtils.logOperationStart('checkAdminRole', { ...context, userId });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('checkAdminRole', 'Using new UserRepository', context);
        const result = await this.repository.checkAdminRole(userId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('checkAdminRole', { 
            ...context, 
            source: 'repository',
            isAdmin: result.getValue()
          });
          return result;
        }

        LogUtils.logOperationWarning('checkAdminRole', 'Repository failed, falling back to legacy', context);
      }

      // TODO: Implémenter fallback vers userActions/checkAdminRole
      LogUtils.logOperationError('checkAdminRole', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for checkAdminRole'));

    } catch (error) {
      LogUtils.logOperationError('checkAdminRole', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour le statut admin d'un utilisateur
   */
  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<Result<Profile, Error>> {
    const context = LogUtils.createOperationContext('updateAdminStatus', 'user-service');
    LogUtils.logOperationStart('updateAdminStatus', { ...context, userId, isAdmin });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('updateAdminStatus', 'Using new UserRepository', context);
        const result = await this.repository.updateAdminStatus(userId, isAdmin);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateAdminStatus', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('updateAdminStatus', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('updateAdminStatus', 'Using legacy userActions', context);
      const legacyResult = await updateUserRole(userId, isAdmin);
      
      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess('updateAdminStatus', { 
          ...context, 
          source: 'legacy' 
        });
        return Result.success(legacyResult.data);
      }

      LogUtils.logOperationError('updateAdminStatus', 'Legacy updateUserRole failed', context);
      return Result.failure(new Error('Failed to update admin status via legacy system'));

    } catch (error) {
      LogUtils.logOperationError('updateAdminStatus', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations de recherche ===

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(searchTerm: string, page = 1, limit = 20): Promise<Result<{ users: AdminUserData[]; total: number }, Error>> {
    const context = LogUtils.createOperationContext('searchUsers', 'user-service');
    LogUtils.logOperationStart('searchUsers', { ...context, searchTerm, page, limit });

    try {
      if (isRepositoryEnabled('USE_USER_REPOSITORY')) {
        LogUtils.logOperationInfo('searchUsers', 'Using new UserRepository', context);
        const result = await this.repository.searchUsers(searchTerm, page, limit);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('searchUsers', { 
            ...context, 
            source: 'repository',
            count: result.getValue()!.users.length
          });
          return result;
        }

        LogUtils.logOperationWarning('searchUsers', 'Repository failed, falling back to legacy', context);
      }

      // Fallback: utiliser getAllUsers et filtrer côté client (simple)
      LogUtils.logOperationInfo('searchUsers', 'Using legacy fallback with client-side filtering', context);
      const allUsersResult = await this.getAllUsers(page, limit);
      
      if (allUsersResult.isSuccess()) {
        const { users, total } = allUsersResult.getValue()!;
        const filteredUsers = users.filter(user => 
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.profile.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.profile.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        LogUtils.logOperationSuccess('searchUsers', { 
          ...context, 
          source: 'legacy-filtered',
          count: filteredUsers.length
        });
        return Result.success({ users: filteredUsers, total: filteredUsers.length });
      }

      return allUsersResult;

    } catch (error) {
      LogUtils.logOperationError('searchUsers', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Instance singleton pour utilisation dans l'application
export const userService = new UserService();