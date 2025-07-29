/**
 * Feature Flags for Repository Pattern Migration (Phase 3)
 * 
 * Ces flags permettent une migration progressive et un rollback instantané
 * en cas de problème avec les nouveaux repositories.
 */

export const REPOSITORY_FEATURE_FLAGS = {
  // Phase 3.1: Foundation Repositories
  USE_USER_REPOSITORY: process.env.FEATURE_USER_REPO === 'true',
  USE_ADDRESS_REPOSITORY: process.env.FEATURE_ADDRESS_REPO === 'true',
  
  // Phase 3.2: Core Business Repositories  
  USE_PRODUCT_REPOSITORY: process.env.FEATURE_PRODUCT_REPO === 'true',
  USE_ORDER_REPOSITORY: process.env.FEATURE_ORDER_REPO === 'true',
  
  // Phase 3.3: Content Repositories
  USE_ARTICLE_REPOSITORY: process.env.FEATURE_ARTICLE_REPO === 'true',
  
  // Migration mode - permet cohabitation ancien/nouveau systèmes
  REPOSITORY_MIGRATION_MODE: process.env.REPOSITORY_MIGRATION_MODE === 'true',
  
  // Debugging - logs détaillés des opérations repository
  DEBUG_REPOSITORY_OPERATIONS: process.env.DEBUG_REPO_OPS === 'true',
} as const;

export type RepositoryFeatureFlag = keyof typeof REPOSITORY_FEATURE_FLAGS;

/**
 * Helper pour vérifier si un repository est activé
 */
export function isRepositoryEnabled(flag: RepositoryFeatureFlag): boolean {
  return REPOSITORY_FEATURE_FLAGS[flag] === true;
}

/**
 * Helper pour logger l'état des feature flags (debug)
 */
export function logRepositoryFlags(): void {
  if (REPOSITORY_FEATURE_FLAGS.DEBUG_REPOSITORY_OPERATIONS) {
    console.log('[REPO-FLAGS] Current repository feature flags:', {
      userRepo: REPOSITORY_FEATURE_FLAGS.USE_USER_REPOSITORY,
      addressRepo: REPOSITORY_FEATURE_FLAGS.USE_ADDRESS_REPOSITORY,
      productRepo: REPOSITORY_FEATURE_FLAGS.USE_PRODUCT_REPOSITORY,
      orderRepo: REPOSITORY_FEATURE_FLAGS.USE_ORDER_REPOSITORY,
      articleRepo: REPOSITORY_FEATURE_FLAGS.USE_ARTICLE_REPOSITORY,
      migrationMode: REPOSITORY_FEATURE_FLAGS.REPOSITORY_MIGRATION_MODE,
    });
  }
}

/**
 * Validation des flags incompatibles
 */
export function validateRepositoryFlags(): void {
  // Si un repository est activé, le mode migration doit être activé aussi
  const anyRepoEnabled = Object.entries(REPOSITORY_FEATURE_FLAGS)
    .filter(([key]) => key.startsWith('USE_') && key.endsWith('_REPOSITORY'))
    .some(([, value]) => value === true);
    
  if (anyRepoEnabled && !REPOSITORY_FEATURE_FLAGS.REPOSITORY_MIGRATION_MODE) {
    console.warn('[REPO-FLAGS] Warning: Repository enabled but migration mode disabled. Enable REPOSITORY_MIGRATION_MODE=true');
  }
}

// Auto-validation au démarrage en dev
if (process.env.NODE_ENV === 'development') {
  validateRepositoryFlags();
  logRepositoryFlags();
}