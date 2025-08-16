# Rapport d'Audit des Commentaires HerbisVeritas

📊 **Généré le**: 16/08/2025 à 13:55:32  
⏱️ **Temps d'exécution**: 123ms  
📁 **Répertoire analysé**: src/

## Métriques Globales

| Métrique                               | Valeur |
| -------------------------------------- | ------ |
| **Fichiers analysés**                  | 346    |
| **Lignes de code totales**             | 52 114 |
| **Commentaires totaux**                | 4395   |
| **Commentaires par fichier (moyenne)** | 12.7   |

## Analyse de Réduction

| Type                                    | Nombre            | Pourcentage |
| --------------------------------------- | ----------------- | ----------- |
| **Commentaires évidents** (à supprimer) | 73                | 1.7%        |
| **Réduction potentielle**               | 73 commentaires   | 1.7%        |
| **Objectif (40% de réduction)**         | 1758 commentaires | 40%         |
| **Statut objectif**                     | ❌ Insuffisant    |             |

## Commentaires à Supprimer (73)

- **src\actions\authActions.ts:6** - Import évident
  `import { createSupabaseServerClient } from "@/lib/supabase/server"; // Importe le client Supabase cô...`

- **src\actions\magazineActions.ts:32** - Fonction évidente
  `// Fonction utilitaire pour nettoyer le contenu TipTap avant sauvegarde`

- **src\actions\magazineActions.ts:94** - Fonction évidente
  `// Fonction utilitaire pour générer un slug`

- **src\app\api\colissimo-token\route.ts:19** - Return évident
  `// Return mock token for development`

- **src\app\layout.tsx:12** - Variable évidente
  `variable: "--font-raleway", // Variable CSS pour Tailwind`

- **src\app\layout.tsx:18** - Variable évidente
  `variable: "--font-playfair", // Variable CSS pour Tailwind`

- **src\app\sitemap.ts:106** - Return évident
  `// Return at least static pages on error`

- **src\app\[locale]\about\page.tsx:5** - Import évident
  `import { StorySection } from "@/components/domain/about/story-section"; // Import de la nouvelle sec...`

- **src\app\[locale]\about\page.tsx:6** - Import évident
  `import { PhotoGallerySection } from "@/components/domain/about/photo-gallery-section"; // Import de ...`

- **src\app\[locale]\admin\products\new\product-form.tsx:49** - Fonction évidente
  `// Fonction utilitaire pour générer un slug`

- **src\app\[locale]\admin\products\new\product-form.tsx:128** - Fonction évidente
  `// Fonction pour gérer les changements de nom avec génération automatique de slug`

- **src\app\[locale]\contact\page.tsx:10** - Import évident
  `import { MarketCalendarView } from "@/components/domain/market/MarketCalendarView"; // Import du nou...`

- **src\app\[locale]\contact\page.tsx:11** - Import évident
  `import { SocialFollow } from "@/components/domain/social/SocialFollow"; // Import du composant pour ...`

- **src\app\[locale]\profile\account\edit\page.tsx:25** - Setter évident
  `// Set the locale for this request`

- **src\app\[locale]\profile\layout.tsx:6** - Import évident
  `import { getTranslations } from "next-intl/server"; // Import pour Server Component`

- **src\app\[locale]\shop\page.tsx:28** - Définition évidente
  `// Define the type for the data mapped for the grid`

- **src\components\common\icon-button.tsx:7** - Définition évidente
  `// Define specific styles for icon buttons, maybe adjusting padding/size`

- **src\components\common\image-upload\index.tsx:64** - Export évident
  `// Export des composants individuels`

- **src\components\common\skip-nav-target.tsx:3** - Import évident
  `import { DEFAULT_CONTENT_ID } from "./skip-nav-link"; // Importe l'ID par défaut`

- **src\components\domain\checkout\CheckoutClientPage.tsx:102** - Import évident
  `// Import des Server Actions pour persister en base`

_... et 53 autres commentaires évidents._

## JSDoc Manquantes (219)

- **src\actions\addressActions.ts:14** - function `addAddress` (async)
- **src\actions\addressActions.ts:87** - function `updateAddress` (async)
- **src\actions\addressActions.ts:160** - function `deleteAddress` (async)
- **src\actions\addressActions.ts:214** - function `getUserAddresses` (async)
- **src\actions\authActions.ts:232** - function `requestPasswordResetAction` (async)
- **src\actions\authActions.ts:287** - function `updatePasswordAction` (async)
- **src\actions\authActions.ts:351** - function `resendConfirmationEmailAction` (async)
- **src\actions\authActions.ts:381** - function `logoutAction` (async)
- **src\actions\cartActions.ts:144** - function `removeItemFromCart` (async)
- **src\actions\cartActions.ts:218** - function `updateCartItemQuantity` (async)
- **src\actions\cartActions.ts:276** - function `removeItemFromCartFormAction` (async)
- **src\actions\cartActions.ts:292** - function `updateCartItemQuantityFormAction` (async)
- **src\actions\cartActions.ts:321** - function `migrateAndGetCart` (async)
- **src\actions\cartActions.ts:426** - function `clearCartAction` (async)
- **src\actions\magazineActions.ts:108** - function `createArticle` (async)

_... et 204 autres fonctions sans JSDoc._

## Actions TODO/FIXME (35)

### Par Priorité

- **UNDEFINED**: 35 éléments

### Détail des TODOs

- **src\actions\marketActions.ts:87** - TODO (UNDEFINED) ⚠️ Sans date
  `// 6. TODO: Emit event (Phase 4)`

- **src\actions\marketActions.ts:159** - TODO (UNDEFINED) ⚠️ Sans date
  `// 6. TODO: Emit event (Phase 4)`

- **src\actions\marketActions.ts:230** - TODO (UNDEFINED) ⚠️ Sans date
  `// 6. TODO: Emit event (Phase 4)`

- **src\actions\orderActions.ts:297** - TODO (UNDEFINED) ⚠️ Sans date
  `// TODO: Si notify_customer est true, envoyer un email au client`

- **src\actions\orderActions.ts:441** - TODO (UNDEFINED) ⚠️ Sans date
  `// TODO: Intégration avec Stripe pour le remboursement réel`

- **src\actions\orderActions.ts:594** - TODO (UNDEFINED) ⚠️ Sans date
  `// TODO: Envoyer un email au client avec le numéro de suivi`

- **src\actions\partnerActions.ts:88** - TODO (UNDEFINED) ⚠️ Sans date
  `// 6. TODO: Emit event (Phase 4)`

- **src\actions\partnerActions.ts:160** - TODO (UNDEFINED) ⚠️ Sans date
  `// 6. TODO: Emit event (Phase 4)`

- **src\actions\partnerActions.ts:231** - TODO (UNDEFINED) ⚠️ Sans date
  `// 6. TODO: Emit event (Phase 4)`

- **src\actions\partnerActions.ts:372** - TODO (UNDEFINED) ⚠️ Sans date
  `// 5. TODO: Emit event (Phase 4)`

## Commentaires Spéciaux à Conserver

### Sécurité (0)

### Performance (0)

## Recommandations

### Actions Immédiates

1. **Supprimer 73 commentaires évidents** (gain: 1.7%)
2. **Ajouter JSDoc à 219 fonctions publiques**
3. **Standardiser 35 TODOs sans date**

### Fichiers Prioritaires

- **src\actions\magazineActions.ts** (10 problèmes)
- **src\lib\magazine\queries.ts** (10 problèmes)
- **src\lib\actions\magazine-actions.ts** (9 problèmes)
- **src\services\cart.service.ts** (9 problèmes)
- **src\stores\cartStore.ts** (9 problèmes)
- **src\actions\cartActions.ts** (6 problèmes)
- **src\lib\cart-helpers.ts** (6 problèmes)
- **src\stores\profileStore.ts** (6 problèmes)
- **src\actions\authActions.ts** (5 problèmes)
- **src\stores\addressStore.ts** (5 problèmes)

### Prochaines Étapes

1. Exécuter le script de nettoyage: `node scripts/cleanup-obvious-comments.js`
2. Appliquer templates JSDoc: `node scripts/add-jsdoc-templates.js`
3. Standardiser TODOs: `node scripts/standardize-todos.js`

---

_Rapport généré automatiquement par audit-comments.js_
