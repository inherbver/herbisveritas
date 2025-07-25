// Utilitaires pour le workflow de publication du magazine

import { checkUserPermission } from "@/lib/auth/server-auth";
import { ArticleDisplay } from "@/types/magazine";

export type PublicationAction = 'publish' | 'unpublish' | 'schedule' | 'archive';

export interface PublicationPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  canViewDrafts: boolean;
}

/**
 * Vérifie les permissions de publication pour l'utilisateur actuel
 */
export async function getPublicationPermissions(): Promise<PublicationPermissions> {
  const [
    canCreate,
    canUpdate,
    canDelete,
    canPublish,
    canUnpublish,
    canViewDrafts
  ] = await Promise.all([
    checkUserPermission("content:create"),
    checkUserPermission("content:update"),
    checkUserPermission("content:delete"),
    checkUserPermission("content:publish"),
    checkUserPermission("content:unpublish"),
    checkUserPermission("content:update") // Les éditeurs peuvent voir les brouillons
  ]);

  return {
    canCreate: canCreate.isAuthorized,
    canUpdate: canUpdate.isAuthorized,
    canDelete: canDelete.isAuthorized,
    canPublish: canPublish.isAuthorized,
    canUnpublish: canUnpublish.isAuthorized,
    canViewDrafts: canViewDrafts.isAuthorized,
  };
}

/**
 * Vérifie si l'utilisateur peut effectuer une action de publication spécifique
 */
export async function canPerformPublicationAction(
  action: PublicationAction,
  article?: ArticleDisplay
): Promise<boolean> {
  const permissions = await getPublicationPermissions();

  switch (action) {
    case 'publish':
      // Seuls les éditeurs/admins peuvent publier
      return permissions.canPublish && (
        !article || 
        article.status === 'draft' || 
        article.status === 'archived'
      );

    case 'unpublish':
      // Seuls les éditeurs/admins peuvent dépublier
      return permissions.canUnpublish && (
        !article || 
        article.status === 'published'
      );

    case 'archive':
      // Les éditeurs/admins peuvent archiver
      return permissions.canUpdate && (
        !article || 
        article.status === 'published' || 
        article.status === 'draft'
      );

    case 'schedule':
      // Pour une future implémentation de la programmation
      return permissions.canPublish;

    default:
      return false;
  }
}

/**
 * Valide les transitions de statut possibles
 */
export function getValidStatusTransitions(currentStatus: string): string[] {
  switch (currentStatus) {
    case 'draft':
      return ['published', 'archived'];
    
    case 'published':
      return ['draft', 'archived'];
    
    case 'archived':
      return ['draft', 'published'];
    
    default:
      return ['draft'];
  }
}

/**
 * Génère un message descriptif pour une action de publication
 */
export function getPublicationActionMessage(action: PublicationAction, articleTitle: string): string {
  switch (action) {
    case 'publish':
      return `L'article "${articleTitle}" a été publié avec succès.`;
    
    case 'unpublish':
      return `L'article "${articleTitle}" a été retiré de la publication.`;
    
    case 'archive':
      return `L'article "${articleTitle}" a été archivé.`;
    
    case 'schedule':
      return `L'article "${articleTitle}" a été programmé pour publication.`;
    
    default:
      return `Action effectuée sur l'article "${articleTitle}".`;
  }
}

/**
 * Valide si un article peut être publié (vérifications de contenu)
 */
export function validateArticleForPublication(article: Partial<ArticleDisplay>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Titre requis
  if (!article.title?.trim()) {
    errors.push("Le titre est requis pour la publication.");
  }

  // Contenu requis
  if (!article.content) {
    errors.push("Le contenu est requis pour la publication.");
  }

  // Slug requis
  if (!article.slug?.trim()) {
    errors.push("L'URL (slug) est requise pour la publication.");
  }

  // Vérification du slug : pas d'espaces, caractères spéciaux limités
  if (article.slug && !/^[a-z0-9-]+$/.test(article.slug)) {
    errors.push("L'URL (slug) ne doit contenir que des lettres minuscules, chiffres et tirets.");
  }

  // Recommandations (warnings, pas des erreurs bloquantes)
  const warnings: string[] = [];
  
  if (!article.excerpt?.trim()) {
    warnings.push("Un extrait est recommandé pour améliorer le SEO.");
  }

  if (!article.featured_image) {
    warnings.push("Une image mise en avant est recommandée.");
  }

  if (!article.seo_title?.trim()) {
    warnings.push("Un titre SEO est recommandé pour le référencement.");
  }

  if (!article.seo_description?.trim()) {
    warnings.push("Une description SEO est recommandée pour le référencement.");
  }

  return {
    isValid: errors.length === 0,
    errors: [...errors, ...warnings]
  };
}