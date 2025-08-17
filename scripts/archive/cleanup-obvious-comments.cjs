#!/usr/bin/env node

/**
 * Script de nettoyage automatique des commentaires évidents
 * Généré automatiquement par audit-comments.js
 */

const fs = require('fs');

const OBVIOUS_COMMENTS_TO_REMOVE = [
  {
    "file": "src\\actions\\authActions.ts",
    "line": 6,
    "text": "import { createSupabaseServerClient } from \"@/lib/supabase/server\"; // Importe le client Supabase côté serveur",
    "reason": "Import évident"
  },
  {
    "file": "src\\actions\\magazineActions.ts",
    "line": 32,
    "text": "// Fonction utilitaire pour nettoyer le contenu TipTap avant sauvegarde",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\actions\\magazineActions.ts",
    "line": 94,
    "text": "// Fonction utilitaire pour générer un slug",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\app\\api\\colissimo-token\\route.ts",
    "line": 19,
    "text": "// Return mock token for development",
    "reason": "Return évident"
  },
  {
    "file": "src\\app\\layout.tsx",
    "line": 12,
    "text": "variable: \"--font-raleway\", // Variable CSS pour Tailwind",
    "reason": "Variable évidente"
  },
  {
    "file": "src\\app\\layout.tsx",
    "line": 18,
    "text": "variable: \"--font-playfair\", // Variable CSS pour Tailwind",
    "reason": "Variable évidente"
  },
  {
    "file": "src\\app\\sitemap.ts",
    "line": 106,
    "text": "// Return at least static pages on error",
    "reason": "Return évident"
  },
  {
    "file": "src\\app\\[locale]\\about\\page.tsx",
    "line": 5,
    "text": "import { StorySection } from \"@/components/domain/about/story-section\"; // Import de la nouvelle section",
    "reason": "Import évident"
  },
  {
    "file": "src\\app\\[locale]\\about\\page.tsx",
    "line": 6,
    "text": "import { PhotoGallerySection } from \"@/components/domain/about/photo-gallery-section\"; // Import de la nouvelle section",
    "reason": "Import évident"
  },
  {
    "file": "src\\app\\[locale]\\admin\\products\\new\\product-form.tsx",
    "line": 49,
    "text": "// Fonction utilitaire pour générer un slug",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\app\\[locale]\\admin\\products\\new\\product-form.tsx",
    "line": 128,
    "text": "// Fonction pour gérer les changements de nom avec génération automatique de slug",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\app\\[locale]\\contact\\page.tsx",
    "line": 10,
    "text": "import { MarketCalendarView } from \"@/components/domain/market/MarketCalendarView\"; // Import du nouveau composant calendrier",
    "reason": "Import évident"
  },
  {
    "file": "src\\app\\[locale]\\contact\\page.tsx",
    "line": 11,
    "text": "import { SocialFollow } from \"@/components/domain/social/SocialFollow\"; // Import du composant pour les réseaux sociaux",
    "reason": "Import évident"
  },
  {
    "file": "src\\app\\[locale]\\profile\\account\\edit\\page.tsx",
    "line": 25,
    "text": "// Set the locale for this request",
    "reason": "Setter évident"
  },
  {
    "file": "src\\app\\[locale]\\profile\\layout.tsx",
    "line": 6,
    "text": "import { getTranslations } from \"next-intl/server\"; // Import pour Server Component",
    "reason": "Import évident"
  },
  {
    "file": "src\\app\\[locale]\\shop\\page.tsx",
    "line": 28,
    "text": "// Define the type for the data mapped for the grid",
    "reason": "Définition évidente"
  },
  {
    "file": "src\\components\\common\\icon-button.tsx",
    "line": 7,
    "text": "// Define specific styles for icon buttons, maybe adjusting padding/size",
    "reason": "Définition évidente"
  },
  {
    "file": "src\\components\\common\\image-upload\\index.tsx",
    "line": 64,
    "text": "// Export des composants individuels",
    "reason": "Export évident"
  },
  {
    "file": "src\\components\\common\\skip-nav-target.tsx",
    "line": 3,
    "text": "import { DEFAULT_CONTENT_ID } from \"./skip-nav-link\"; // Importe l'ID par défaut",
    "reason": "Import évident"
  },
  {
    "file": "src\\components\\domain\\checkout\\CheckoutClientPage.tsx",
    "line": 102,
    "text": "// Import des Server Actions pour persister en base",
    "reason": "Import évident"
  },
  {
    "file": "src\\components\\domain\\colissimo\\ColissimoWidget.tsx",
    "line": 6,
    "text": "// Déclaration globale pour jQuery Colissimo plugin",
    "reason": "Déclaration évidente"
  },
  {
    "file": "src\\components\\features\\admin\\magazine\\article-form\\ArticleFormFields.tsx",
    "line": 39,
    "text": "// Fonction utilitaire pour générer un slug",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\components\\features\\admin\\magazine\\index.ts",
    "line": 1,
    "text": "// Export des composants admin du magazine",
    "reason": "Export évident"
  },
  {
    "file": "src\\components\\features\\magazine\\auto-save-editor.tsx",
    "line": 38,
    "text": "// Fonction de sauvegarde automatique",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\components\\features\\magazine\\auto-save-editor.tsx",
    "line": 142,
    "text": "// Fonction pour supprimer le brouillon sauvegardé",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\components\\features\\magazine\\editor\\FileUploadHandler.ts",
    "line": 5,
    "text": "// Fonction utilitaire pour convertir un blob en base64",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\components\\features\\magazine\\image-upload.tsx",
    "line": 45,
    "text": "// Export des interfaces pour rétrocompatibilité",
    "reason": "Export évident"
  },
  {
    "file": "src\\components\\features\\magazine\\index.ts",
    "line": 1,
    "text": "// Export des composants du magazine",
    "reason": "Export évident"
  },
  {
    "file": "src\\components\\features\\shop\\product-grid.tsx",
    "line": 8,
    "text": "// Define a type for the product data, excluding functions and generated IDs",
    "reason": "Définition évidente"
  },
  {
    "file": "src\\components\\features\\shop\\quantity-input.tsx",
    "line": 4,
    "text": "import { motion } from \"framer-motion\"; // Import motion",
    "reason": "Import évident"
  },
  {
    "file": "src\\components\\forms\\login-form.tsx",
    "line": 7,
    "text": "import React, { useEffect } from \"react\"; // Import useEffect",
    "reason": "Import évident"
  },
  {
    "file": "src\\components\\forms\\login-form.tsx",
    "line": 8,
    "text": "import { toast } from \"sonner\"; // Import toast from sonner",
    "reason": "Import évident"
  },
  {
    "file": "src\\components\\layout\\client-layout.tsx",
    "line": 40,
    "text": "// Fonction pour vider le panier de manière sécurisée",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\components\\layout\\client-layout.tsx",
    "line": 50,
    "text": "// Fonction helper pour les appels Supabase avec timeout et retry",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\components\\layout\\client-layout.tsx",
    "line": 92,
    "text": "// Fonction pour valider la session de manière asynchrone avec timeout et retry",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\hooks\\use-auth.ts",
    "line": 19,
    "text": "// Set up an auth state change listener.",
    "reason": "Setter évident"
  },
  {
    "file": "src\\hooks\\use-cart-hydrated.ts",
    "line": 22,
    "text": "// Return 0 during SSR and initial hydration to prevent mismatch",
    "reason": "Return évident"
  },
  {
    "file": "src\\hooks\\use-cart-hydrated.ts",
    "line": 33,
    "text": "// Return empty array during SSR and initial hydration",
    "reason": "Return évident"
  },
  {
    "file": "src\\hooks\\use-cart-hydrated.ts",
    "line": 44,
    "text": "// Return 0 during SSR and initial hydration",
    "reason": "Return évident"
  },
  {
    "file": "src\\hooks\\use-hydrated.ts",
    "line": 21,
    "text": "// Export par défaut pour améliorer la compatibilité",
    "reason": "Export évident"
  },
  {
    "file": "src\\hooks\\useAddressAutocomplete.ts",
    "line": 63,
    "text": "// Fonction de nettoyage des timeouts",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\hooks\\useAddressAutocomplete.ts",
    "line": 71,
    "text": "// Fonction de nettoyage des requêtes en cours",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\lib\\actions\\magazine-actions.ts",
    "line": 491,
    "text": "// Get updated article for stats",
    "reason": "Getter évident"
  },
  {
    "file": "src\\lib\\admin\\dashboard.ts",
    "line": 95,
    "text": "// Fonction principale exportée pour récupérer les logs d'activité récents",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\lib\\admin\\dashboard.ts",
    "line": 155,
    "text": "// Fonction utilitaire pour générer des descriptions d'événements plus lisibles",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\lib\\auth\\profile-cleanup.ts",
    "line": 66,
    "text": "// Get all profiles for this user, ordered by creation date",
    "reason": "Getter évident"
  },
  {
    "file": "src\\lib\\auth\\profile-cleanup.ts",
    "line": 116,
    "text": "// Create missing profile",
    "reason": "Création évidente"
  },
  {
    "file": "src\\lib\\core\\error-manager.ts",
    "line": 696,
    "text": "// Export et Helpers",
    "reason": "Export évident"
  },
  {
    "file": "src\\lib\\magazine\\queries.ts",
    "line": 13,
    "text": "// Fonction utilitaire pour assurer que le contenu est un objet JSON valide",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\lib\\markets\\transformers.ts",
    "line": 110,
    "text": "marketEndDateTime = new Date(`${marketDateString}T${market.endTime}:00Z`); // Create as UTC",
    "reason": "Création évidente"
  },
  {
    "file": "src\\lib\\storage\\image-upload.ts",
    "line": 38,
    "text": "// Fonction core d'upload",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\lib\\stripe\\utils.ts",
    "line": 213,
    "text": "// Create masked string with proper grouping",
    "reason": "Création évidente"
  },
  {
    "file": "src\\lib\\supabase\\queries\\products.ts",
    "line": 90,
    "text": "// Export cached version",
    "reason": "Export évident"
  },
  {
    "file": "src\\lib\\supabase\\queries\\products.ts",
    "line": 97,
    "text": "// Define the specific type for the getProductBySlug query result",
    "reason": "Définition évidente"
  },
  {
    "file": "src\\lib\\validators\\newsletter.ts",
    "line": 77,
    "text": "// Export types inferred from schemas",
    "reason": "Export évident"
  },
  {
    "file": "src\\middleware.ts",
    "line": 81,
    "text": "// Fonction helper pour les appels Supabase avec timeout",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\middleware.ts",
    "line": 199,
    "text": "// Import dynamique pour éviter les problèmes de dépendance circulaire",
    "reason": "Import évident"
  },
  {
    "file": "src\\mocks\\colissimo-data.ts",
    "line": 237,
    "text": "// Return points but update the postal code and city to match request",
    "reason": "Return évident"
  },
  {
    "file": "src\\mocks\\colissimo-data.ts",
    "line": 246,
    "text": "// Return default points with updated postal code",
    "reason": "Return évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 148,
    "text": "// Get product details with stock validation",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 169,
    "text": "// Get or create cart",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 230,
    "text": "// Get cart",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 241,
    "text": "// Get item before removal for event",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 304,
    "text": "// Get cart",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 315,
    "text": "// Get current item for event data",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 369,
    "text": "// Get cart",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 423,
    "text": "// Return cart anyway but log the validation issues",
    "reason": "Return évident"
  },
  {
    "file": "src\\services\\cart.service.ts",
    "line": 453,
    "text": "// Get both carts",
    "reason": "Getter évident"
  },
  {
    "file": "src\\services\\magazine.service.ts",
    "line": 527,
    "text": "// Export du service instancié pour utilisation directe",
    "reason": "Export évident"
  },
  {
    "file": "src\\test-utils\\index.ts",
    "line": 40,
    "text": "// Import des factories à l'intérieur de la fonction pour éviter les références circulaires",
    "reason": "Import évident"
  },
  {
    "file": "src\\test-utils\\render.tsx",
    "line": 111,
    "text": "// Fonction rerender personnalisée",
    "reason": "Fonction évidente"
  },
  {
    "file": "src\\test-utils\\render.tsx",
    "line": 210,
    "text": "// Export par défaut",
    "reason": "Export évident"
  },
  {
    "file": "src\\utils\\formatters.ts",
    "line": 111,
    "text": "// Return original if no pattern matches",
    "reason": "Return évident"
  }
];

console.log('🧹 Début du nettoyage des commentaires évidents...');
console.log(`📝 ${OBVIOUS_COMMENTS_TO_REMOVE.length} commentaires à supprimer`);

let removedCount = 0;
let errorCount = 0;

OBVIOUS_COMMENTS_TO_REMOVE.forEach((comment, index) => {
  try {
    const content = fs.readFileSync(comment.file, 'utf8');
    const lines = content.split('\n');
    
    // Vérifier que la ligne correspond toujours
    if (lines[comment.line - 1] && lines[comment.line - 1].trim() === comment.text.trim()) {
      lines.splice(comment.line - 1, 1);
      fs.writeFileSync(comment.file, lines.join('\n'));
      removedCount++;
      console.log(`✅ (${index + 1}/${OBVIOUS_COMMENTS_TO_REMOVE.length}) ${comment.file}:${comment.line}`);
    } else {
      console.warn(`⚠️  Ligne modifiée, ignorée: ${comment.file}:${comment.line}`);
    }
  } catch (error) {
    errorCount++;
    console.error(`❌ Erreur ${comment.file}: ${error.message}`);
  }
});

console.log(`\n🎉 Nettoyage terminé !`);
console.log(`   • ${removedCount} commentaires supprimés`);
console.log(`   • ${errorCount} erreurs`);
console.log(`\n⚠️  N'oubliez pas de :`);
console.log(`   1. Vérifier les changements: git diff`);
console.log(`   2. Tester la compilation: npm run typecheck`);
console.log(`   3. Lancer les tests: npm run test`);
