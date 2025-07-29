"use server";

import { revalidatePath } from "next/cache";
import { addressSchema, AddressFormData } from "@/lib/validators/address.validator";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// New imports for Clean Architecture with Repository Pattern
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { 
  ValidationError, 
  AuthenticationError,
  ErrorUtils 
} from "@/lib/core/errors";
import { resolveService } from "@/lib/infrastructure/container/container.config";
import { SERVICE_TOKENS } from "@/lib/infrastructure/container/container";
import type { IAddressRepository } from "@/lib/domain/interfaces/address.repository.interface";

/**
 * Version migrée de addAddress utilisant le Repository Pattern
 * 
 * Cette version montre comment utiliser l'AddressRepository au lieu d'accéder
 * directement à Supabase dans le Server Action.
 */
export async function addAddressMigrated(
  data: AddressFormData, 
  locale: string
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'add_address_migrated', 'profile');
  LogUtils.logOperationStart('add_address_migrated', context);

  try {
    // Authentification (reste identique)
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    // i18n (reste identique)
    const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

    // Validation avec Zod (reste identique)
    const validationResult = addressSchema.safeParse(data);
    if (!validationResult.success) {
      throw new ValidationError(
        t("validationError"),
        'address_validation',
        validationResult.error.issues
      );
    }

    // 🎯 Phase 3 - Utilisation du Repository via DI Container
    const addressRepository = await resolveService<IAddressRepository>(SERVICE_TOKENS.ADDRESS_REPOSITORY);
    
    // Le repository encapsule toute la logique de création d'adresse
    const createResult = await addressRepository.create({
      user_id: user.id,
      ...validationResult.data
    });
    
    if (createResult.isError()) {
      throw createResult.getError();
    }
    
    const newAddress = createResult.getValue();

    // Revalidation (reste identique)
    revalidatePath("/profile/addresses");

    LogUtils.logOperationSuccess('add_address_migrated', { 
      ...context, 
      addressId: newAddress.id,
      repositoryUsed: true 
    });

    return ActionResult.ok(newAddress, t("addSuccess"));
  } catch (error) {
    LogUtils.logOperationError('add_address_migrated', error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) 
        ? ErrorUtils.formatForUser(error) 
        : await getTranslations({ locale, namespace: "AddressForm.serverActions" }).then(t => t("addError"))
    );
  }
}

/**
 * Version migrée de updateAddress utilisant le Repository Pattern
 */
export async function updateAddressMigrated(
  addressId: string,
  data: AddressFormData, 
  locale: string
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'update_address_migrated', 'profile');
  LogUtils.logOperationStart('update_address_migrated', context);

  try {
    // Authentification
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    // i18n
    const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

    // Validation
    const validationResult = addressSchema.safeParse(data);
    if (!validationResult.success) {
      throw new ValidationError(
        t("validationError"),
        'address_validation',
        validationResult.error.issues
      );
    }

    // 🎯 Phase 3 - Utilisation du Repository
    const addressRepository = await resolveService<IAddressRepository>(SERVICE_TOKENS.ADDRESS_REPOSITORY);
    
    // Vérifier que l'adresse appartient à l'utilisateur
    const existingResult = await addressRepository.findById(addressId);
    if (existingResult.isError()) {
      throw existingResult.getError();
    }
    
    const existingAddress = existingResult.getValue();
    if (!existingAddress || existingAddress.user_id !== user.id) {
      throw new AuthenticationError("Adresse non trouvée ou accès non autorisé");
    }
    
    // Mise à jour via le repository
    const updateResult = await addressRepository.update(addressId, validationResult.data);
    
    if (updateResult.isError()) {
      throw updateResult.getError();
    }
    
    const updatedAddress = updateResult.getValue();

    // Revalidation
    revalidatePath("/profile/addresses");

    LogUtils.logOperationSuccess('update_address_migrated', { 
      ...context, 
      addressId,
      repositoryUsed: true 
    });

    return ActionResult.ok(updatedAddress, t("updateSuccess"));
  } catch (error) {
    LogUtils.logOperationError('update_address_migrated', error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) 
        ? ErrorUtils.formatForUser(error) 
        : await getTranslations({ locale, namespace: "AddressForm.serverActions" }).then(t => t("updateError"))
    );
  }
}

/**
 * Version migrée de deleteAddress utilisant le Repository Pattern
 */
export async function deleteAddressMigrated(
  addressId: string,
  locale: string
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'delete_address_migrated', 'profile');
  LogUtils.logOperationStart('delete_address_migrated', context);

  try {
    // Authentification
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    // i18n
    const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

    // 🎯 Phase 3 - Utilisation du Repository
    const addressRepository = await resolveService<IAddressRepository>(SERVICE_TOKENS.ADDRESS_REPOSITORY);
    
    // Vérifier que l'adresse appartient à l'utilisateur avant suppression
    const existingResult = await addressRepository.findById(addressId);
    if (existingResult.isError()) {
      throw existingResult.getError();
    }
    
    const existingAddress = existingResult.getValue();
    if (!existingAddress || existingAddress.user_id !== user.id) {
      throw new AuthenticationError("Adresse non trouvée ou accès non autorisé");
    }
    
    // Suppression via le repository
    const deleteResult = await addressRepository.delete(addressId);
    
    if (deleteResult.isError()) {
      throw deleteResult.getError();
    }

    // Revalidation
    revalidatePath("/profile/addresses");

    LogUtils.logOperationSuccess('delete_address_migrated', { 
      ...context, 
      addressId,
      repositoryUsed: true 
    });

    return ActionResult.ok(null, t("deleteSuccess"));
  } catch (error) {
    LogUtils.logOperationError('delete_address_migrated', error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) 
        ? ErrorUtils.formatForUser(error) 
        : await getTranslations({ locale, namespace: "AddressForm.serverActions" }).then(t => t("deleteError"))
    );
  }
}

/**
 * Avantages de la migration Repository Pattern :
 * 
 * 1. 🎯 **Séparation des préoccupations**: 
 *    - Server Action = logique présentation + validation + auth
 *    - Repository = logique d'accès aux données
 * 
 * 2. 📦 **Dependency Injection**: 
 *    - Container résout automatiquement les dépendances
 *    - Facile à mocker pour les tests
 * 
 * 3. 🔄 **Réutilisabilité**: 
 *    - Logique d'adresse réutilisable dans d'autres contextes
 *    - Cohérence entre toutes les opérations CRUD
 * 
 * 4. 🧪 **Testabilité**: 
 *    - Repository mockable indépendamment
 *    - Tests unitaires plus faciles
 * 
 * 5. 🛡️ **Sécurité**: 
 *    - Validation centralisée dans le repository
 *    - RLS et permissions appliquées de manière cohérente
 * 
 * 6. 📊 **Observabilité**: 
 *    - Logging enrichi avec informations repository
 *    - Métriques de performance centralisées
 */