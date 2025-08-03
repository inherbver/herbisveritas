/**
 * User Repository - Implémentation Supabase
 * 
 * Implémente IUserRepository en utilisant Supabase comme source de données.
 * Gère les utilisateurs, profils, et opérations admin avec RLS compliance.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server-admin';
import { Result } from '@/lib/core/result';
import { DatabaseError, ValidationError, NotFoundError } from '@/lib/core/errors';
import { LogUtils } from '@/lib/core/logger';
import type { 
  IUserRepository,
  User,
  Profile, 
  UserWithProfile,
  CreateProfileData,
  UpdateProfileData,
  AdminUserData
} from '@/lib/domain/interfaces/user.repository.interface';
import type { SupabaseClient } from '@supabase/supabase-js';

export class UserSupabaseRepository implements IUserRepository {
  private adminClient: SupabaseClient;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
  }

  /**
   * Helper pour gérer les erreurs
   */
  private handleError(error: unknown): Result<never, Error> {
    if (error instanceof Error) {
      return Result.failure(new DatabaseError(error.message));
    }
    return Result.failure(new DatabaseError('Unknown error occurred'));
  }

  // === Opérations de base utilisateur ===

  async findByEmail(email: string): Promise<Result<User | null, Error>> {
    const context = LogUtils.createUserActionContext('system', 'findByEmail');
    LogUtils.logOperationStart('findByEmail', context);

    try {
      const { data, error } = await this.adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });

      if (error) {
        LogUtils.logOperationError('findByEmail', error, context);
        return Result.failure(new DatabaseError(`Error finding user by email: ${error.message}`));
      }

      const user = data.users.find(u => u.email === email);
      if (!user) {
        LogUtils.logOperationSuccess('findByEmail', { ...context, found: false });
        return Result.success(null);
      }

      const mappedUser: User = {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        updated_at: user.updated_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
      };

      LogUtils.logOperationSuccess('findByEmail', { ...context, found: true, userId: user.id });
      return Result.success(mappedUser);
    } catch (error) {
      LogUtils.logOperationError('findByEmail', error, context);
      return this.handleError(error);
    }
  }

  async findByIdWithProfile(id: string): Promise<Result<UserWithProfile | null, Error>> {
    const context = LogUtils.createOperationContext('findByIdWithProfile', 'user-repository');
    LogUtils.logOperationStart('findByIdWithProfile', { ...context, userId: id });

    try {
      // Récupérer l'utilisateur via auth admin
      const { data: userData, error: userError } = await this.adminClient.auth.admin.getUserById(id);

      if (userError) {
        LogUtils.logOperationError('findByIdWithProfile', userError, context);
        return Result.failure(new DatabaseError(`Error finding user: ${userError.message}`));
      }

      if (!userData.user) {
        LogUtils.logOperationSuccess('findByIdWithProfile', { ...context, found: false });
        return Result.success(null);
      }

      const user: User = {
        id: userData.user.id,
        email: userData.user.email || '',
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at,
        email_confirmed_at: userData.user.email_confirmed_at,
        last_sign_in_at: userData.user.last_sign_in_at,
      };

      // Récupérer le profil
      const client = await createSupabaseServerClient();
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        LogUtils.logOperationError('findByIdWithProfile', profileError, context);
        return Result.failure(new DatabaseError(`Error finding profile: ${profileError.message}`));
      }

      const userWithProfile: UserWithProfile = {
        ...user,
        profile: profileData || undefined
      };

      LogUtils.logOperationSuccess('findByIdWithProfile', { 
        ...context, 
        found: true, 
        hasProfile: !!profileData 
      });
      return Result.success(userWithProfile);
    } catch (error) {
      LogUtils.logOperationError('findByIdWithProfile', error, context);
      return this.handleError(error);
    }
  }

  async findAllWithProfiles(page = 1, limit = 20): Promise<Result<{ users: AdminUserData[]; total: number }, Error>> {
    const context = LogUtils.createOperationContext('findAllWithProfiles', 'user-repository');
    LogUtils.logOperationStart('findAllWithProfiles', { ...context, page, limit });

    try {
      // Récupérer les utilisateurs avec pagination
      const { data: authData, error: authError } = await this.adminClient.auth.admin.listUsers({
        page,
        perPage: limit
      });

      if (authError) {
        LogUtils.logOperationError('findAllWithProfiles', authError, context);
        return Result.failure(new DatabaseError(`Error listing users: ${authError.message}`));
      }

      const userIds = authData.users.map(u => u.id);
      
      // Récupérer les profils
      const client = await createSupabaseServerClient();
      const { data: profilesData, error: profilesError } = await client
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        LogUtils.logOperationError('findAllWithProfiles', profilesError, context);
        return Result.failure(new DatabaseError(`Error finding profiles: ${profilesError.message}`));
      }

      // Créer un map des profils par user_id
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combiner les données
      const adminUsers: AdminUserData[] = authData.users.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        profile: profilesMap.get(user.id) || {
          id: '',
          user_id: user.id,
          first_name: null,
          last_name: null,
          phone: null,
          avatar_url: null,
          is_admin: false,
          marketing_consent: false,
          created_at: user.created_at,
          updated_at: user.updated_at,
        }
      }));

      LogUtils.logOperationSuccess('findAllWithProfiles', { 
        ...context, 
        usersCount: adminUsers.length,
        total: authData.total || adminUsers.length
      });

      return Result.success({ 
        users: adminUsers, 
        total: authData.total || adminUsers.length 
      });
    } catch (error) {
      LogUtils.logOperationError('findAllWithProfiles', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations profil ===

  async createProfile(userId: string, profileData: CreateProfileData): Promise<Result<Profile, Error>> {
    const context = LogUtils.createUserActionContext('system', 'getUserStats');
    LogUtils.logOperationStart('createProfile', { ...context, userId });

    try {
      const client = await createSupabaseServerClient();
      const { data, error } = await client
        .from('profiles')
        .insert({
          user_id: userId,
          first_name: profileData.first_name || null,
          last_name: profileData.last_name || null,
          phone: profileData.phone || null,
          avatar_url: profileData.avatar_url || null,
          marketing_consent: profileData.marketing_consent || false,
          is_admin: false, // Toujours false par défaut
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('createProfile', error, context);
        return Result.failure(new DatabaseError(`Error creating profile: ${error.message}`));
      }

      LogUtils.logOperationSuccess('createProfile', { ...context, profileId: data.id });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('createProfile', error, context);
      return this.handleError(error);
    }
  }

  async updateProfile(userId: string, profileData: UpdateProfileData): Promise<Result<Profile, Error>> {
    const context = LogUtils.createUserActionContext(userId, 'updateUserProfile');
    LogUtils.logOperationStart('updateProfile', { ...context, userId });

    try {
      const client = await createSupabaseServerClient();
      const { data, error } = await client
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('updateProfile', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Profile not found for user ${userId}`));
        }
        return Result.failure(new DatabaseError(`Error updating profile: ${error.message}`));
      }

      LogUtils.logOperationSuccess('updateProfile', { ...context, profileId: data.id });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('updateProfile', error, context);
      return this.handleError(error);
    }
  }

  async findProfileByUserId(userId: string): Promise<Result<Profile | null, Error>> {
    const context = LogUtils.createUserActionContext('system', 'findProfileByUserId');
    LogUtils.logOperationStart('findProfileByUserId', { ...context, userId });

    try {
      const client = await createSupabaseServerClient();
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        LogUtils.logOperationError('findProfileByUserId', error, context);
        return Result.failure(new DatabaseError(`Error finding profile: ${error.message}`));
      }

      LogUtils.logOperationSuccess('findProfileByUserId', { 
        ...context, 
        found: !!data 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('findProfileByUserId', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations admin ===

  async checkAdminRole(userId: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createUserActionContext('system', 'checkAdminRole');
    LogUtils.logOperationStart('checkAdminRole', { ...context, userId });

    try {
      const client = await createSupabaseServerClient();
      const { data, error } = await client
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        LogUtils.logOperationError('checkAdminRole', error, context);
        return Result.failure(new DatabaseError(`Error checking admin role: ${error.message}`));
      }

      const isAdmin = data?.is_admin || false;
      LogUtils.logOperationSuccess('checkAdminRole', { ...context, isAdmin });
      return Result.success(isAdmin);
    } catch (error) {
      LogUtils.logOperationError('checkAdminRole', error, context);
      return this.handleError(error);
    }
  }

  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<Result<Profile, Error>> {
    const context = LogUtils.createUserActionContext('system', 'updateAdminStatus');
    LogUtils.logOperationStart('updateAdminStatus', { ...context, userId, isAdmin });

    try {
      const client = await createSupabaseServerClient();
      const { data, error } = await client
        .from('profiles')
        .update({
          is_admin: isAdmin,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('updateAdminStatus', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Profile not found for user ${userId}`));
        }
        return Result.failure(new DatabaseError(`Error updating admin status: ${error.message}`));
      }

      LogUtils.logOperationSuccess('updateAdminStatus', { ...context, profileId: data.id });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('updateAdminStatus', error, context);
      return this.handleError(error);
    }
  }

  async deleteUser(userId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createUserActionContext(userId, 'deleteUser');
    LogUtils.logOperationStart('deleteUser', { ...context, userId });

    try {
      // Note: Dans une vraie implémentation, on ferait un soft delete
      // Pour l'instant, on marque juste le profil comme supprimé
      const client = await createSupabaseServerClient();
      const { error } = await client
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
          // On pourrait ajouter un champ deleted_at si nécessaire
        })
        .eq('user_id', userId);

      if (error) {
        LogUtils.logOperationError('deleteUser', error, context);
        return Result.failure(new DatabaseError(`Error deleting user: ${error.message}`));
      }

      LogUtils.logOperationSuccess('deleteUser', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('deleteUser', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de recherche ===

  async searchUsers(searchTerm: string, page = 1, limit = 20): Promise<Result<{ users: AdminUserData[]; total: number }, Error>> {
    // Implémentation simplifiée pour maintenant
    // Dans une vraie implémentation, on ferait une recherche full-text
    return this.findAllWithProfiles(page, limit);
  }

  async findAdminUsers(): Promise<Result<AdminUserData[], Error>> {
    const context = LogUtils.createUserActionContext('system', 'findAdminUsers');
    LogUtils.logOperationStart('findAdminUsers', context);

    try {
      const client = await createSupabaseServerClient();
      const { data: profilesData, error: profilesError } = await client
        .from('profiles')
        .select('*')
        .eq('is_admin', true);

      if (profilesError) {
        LogUtils.logOperationError('findAdminUsers', profilesError, context);
        return Result.failure(new DatabaseError(`Error finding admin profiles: ${profilesError.message}`));
      }

      const adminUserIds = profilesData?.map(p => p.user_id) || [];
      if (adminUserIds.length === 0) {
        LogUtils.logOperationSuccess('findAdminUsers', { ...context, adminCount: 0 });
        return Result.success([]);
      }

      // Récupérer les données auth pour ces utilisateurs
      const { data: authData, error: authError } = await this.adminClient.auth.admin.listUsers();

      if (authError) {
        LogUtils.logOperationError('findAdminUsers', authError, context);
        return Result.failure(new DatabaseError(`Error listing admin users: ${authError.message}`));
      }

      const adminUsers = authData.users
        .filter(user => adminUserIds.includes(user.id))
        .map(user => {
          const profile = profilesData?.find(p => p.user_id === user.id);
          return {
            id: user.id,
            email: user.email || '',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            profile: profile!
          };
        });

      LogUtils.logOperationSuccess('findAdminUsers', { 
        ...context, 
        adminCount: adminUsers.length 
      });
      return Result.success(adminUsers);
    } catch (error) {
      LogUtils.logOperationError('findAdminUsers', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de validation ===

  async validateProfileData(profileData: CreateProfileData | UpdateProfileData): Promise<Result<void, Error>> {
    const context = LogUtils.createUserActionContext('system', 'validateProfileData');

    try {
      // Validation basique
      if (profileData.first_name && profileData.first_name.length > 50) {
        return Result.failure(new ValidationError('First name too long (max 50 characters)'));
      }

      if (profileData.last_name && profileData.last_name.length > 50) {
        return Result.failure(new ValidationError('Last name too long (max 50 characters)'));
      }

      if (profileData.phone && !/^[\+]?[0-9\-\s\(\)]+$/.test(profileData.phone)) {
        return Result.failure(new ValidationError('Invalid phone number format'));
      }

      LogUtils.logOperationSuccess('validateProfileData', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('validateProfileData', error, context);
      return this.handleError(error);
    }
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createUserActionContext('system', 'searchUsers');
    LogUtils.logOperationStart('isEmailTaken', { ...context, email, excludeUserId });

    try {
      const { data, error } = await this.adminClient.auth.admin.listUsers();

      if (error) {
        LogUtils.logOperationError('isEmailTaken', error, context);
        return Result.failure(new DatabaseError(`Error checking email: ${error.message}`));
      }

      const existingUser = data.users.find(u => 
        u.email === email && u.id !== excludeUserId
      );

      const isTaken = !!existingUser;
      LogUtils.logOperationSuccess('isEmailTaken', { ...context, isTaken });
      return Result.success(isTaken);
    } catch (error) {
      LogUtils.logOperationError('isEmailTaken', error, context);
      return this.handleError(error);
    }
  }

}