"use server";

import { withPermissionSafe } from "@/lib/auth/server-actions-auth";

// New imports for Clean Architecture with Repository Pattern
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ErrorUtils } from "@/lib/core/errors";
import { resolveAdminService } from "@/lib/infrastructure/container/container.config";
import { SERVICE_TOKENS } from "@/lib/infrastructure/container/container";
import type { IUserRepository } from "@/lib/domain/interfaces/user.repository.interface";

export interface UserForAdminPanel {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

/**
 * Version migrée de getUsers utilisant le Repository Pattern
 * 
 * Cette version montre comment utiliser le UserRepository au lieu d'accéder
 * directement à Supabase dans le Server Action.
 */
export const getUsersMigrated = withPermissionSafe(
  "users:read:all",
  async (): Promise<ActionResult<UserForAdminPanel[]>> => {
    const context = LogUtils.createUserActionContext('unknown', 'get_users_migrated', 'admin');
    LogUtils.logOperationStart('get_users_migrated', context);

    try {
      // 🎯 Phase 3 - Utilisation du Repository via DI Container
      const userRepository = await resolveAdminService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);
      
      // Le repository encapsule toute la logique de récupération des utilisateurs
      const result = await userRepository.findAllWithProfiles();
      
      if (result.isError()) {
        throw result.getError();
      }
      
      const { users } = result.getValue();
      
      // Transformation des données pour l'interface admin
      const adminUsers: UserForAdminPanel[] = users.map((userData) => {
        const fullName = [userData.profile?.first_name, userData.profile?.last_name]
          .filter(Boolean)
          .join(" ") || null;

        return {
          id: userData.id,
          email: userData.email,
          full_name: fullName,
          role: userData.profile?.role || "user",
          created_at: userData.created_at,
          last_sign_in_at: userData.last_sign_in_at || null,
        };
      });

      LogUtils.logOperationSuccess('get_users_migrated', { 
        ...context, 
        userCount: adminUsers.length,
        repositoryUsed: true 
      });
      
      return ActionResult.ok(adminUsers, `${adminUsers.length} utilisateurs récupérés via Repository`);
    } catch (error) {
      LogUtils.logOperationError('get_users_migrated', error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error) 
          ? ErrorUtils.formatForUser(error) 
          : 'Impossible de récupérer les utilisateurs'
      );
    }
  }
);

/**
 * Exemple d'autres opérations utilisant le Repository Pattern
 */
export const getUserByIdMigrated = withPermissionSafe(
  "users:read:all",
  async (userId: string): Promise<ActionResult<UserForAdminPanel | null>> => {
    const context = LogUtils.createUserActionContext('unknown', 'get_user_by_id_migrated', 'admin');
    LogUtils.logOperationStart('get_user_by_id_migrated', context);

    try {
      // Utilisation du repository pour une opération spécifique
      const userRepository = await resolveAdminService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);
      
      const result = await userRepository.findByIdWithProfile(userId);
      
      if (result.isError()) {
        throw result.getError();
      }
      
      const userData = result.getValue();
      
      if (!userData) {
        LogUtils.logOperationSuccess('get_user_by_id_migrated', { ...context, found: false });
        return ActionResult.ok(null, 'Utilisateur non trouvé');
      }
      
      // Transformation pour l'interface admin
      const adminUser: UserForAdminPanel = {
        id: userData.id,
        email: userData.email,
        full_name: [userData.profile?.first_name, userData.profile?.last_name]
          .filter(Boolean)
          .join(" ") || null,
        role: userData.profile?.role || "user",
        created_at: userData.created_at,
        last_sign_in_at: userData.last_sign_in_at || null,
      };

      LogUtils.logOperationSuccess('get_user_by_id_migrated', { 
        ...context, 
        found: true,
        repositoryUsed: true 
      });
      
      return ActionResult.ok(adminUser, 'Utilisateur récupéré via Repository');
    } catch (error) {
      LogUtils.logOperationError('get_user_by_id_migrated', error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error) 
          ? ErrorUtils.formatForUser(error) 
          : 'Impossible de récupérer l\'utilisateur'
      );
    }
  }
);

/**
 * Points clés de la migration Repository Pattern :
 * 
 * 1. 📦 **Dependency Injection**: utilisation de `resolveAdminService()` 
 *    au lieu de créer directement le client Supabase
 * 
 * 2. 🎯 **Séparation des préoccupations**: le Server Action se concentre sur
 *    la logique de présentation, le Repository gère l'accès aux données
 * 
 * 3. 🧪 **Testabilité**: possibilité de mocker facilement le repository
 *    pour les tests unitaires
 * 
 * 4. 🔄 **Réutilisabilité**: la logique de récupération des utilisateurs
 *    peut être réutilisée dans d'autres contextes
 * 
 * 5. 📊 **Observabilité**: logging enrichi avec information sur l'utilisation
 *    du repository
 */