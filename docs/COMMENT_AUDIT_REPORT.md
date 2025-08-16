# Rapport d'Audit des Commentaires HerbisVeritas

📊 **Généré le**: 16/08/2025 à 01:53:39  
⏱️ **Temps d'exécution**: 257ms  
📁 **Répertoire analysé**: src/

## Métriques Globales

| Métrique | Valeur |
|----------|--------|
| **Fichiers analysés** | 329 |
| **Lignes de code totales** | 49 206 |
| **Commentaires totaux** | 3914 |
| **Commentaires par fichier (moyenne)** | 11.9 |

## Analyse de Réduction

| Type | Nombre | Pourcentage |
|------|--------|-------------|
| **Commentaires évidents** (à supprimer) | 66 | 1.7% |
| **Réduction potentielle** | 66 commentaires | 1.7% |
| **Objectif (40% de réduction)** | 1566 commentaires | 40% |
| **Statut objectif** | ❌ Insuffisant | |

## Commentaires à Supprimer (66)

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

- **src\components\common\skip-nav-target.tsx:3** - Import évident
  `import { DEFAULT_CONTENT_ID } from "./skip-nav-link"; // Importe l'ID par défaut`

- **src\components\domain\checkout\CheckoutClientPage.tsx:102** - Import évident
  `// Import des Server Actions pour persister en base`

- **src\components\domain\colissimo\ColissimoWidget.tsx:6** - Déclaration évidente
  `// Déclaration globale pour jQuery Colissimo plugin`

- **src\components\features\admin\magazine\index.ts:1** - Export évident
  `// Export des composants admin du magazine`

- **src\components\features\magazine\auto-save-editor.tsx:38** - Fonction évidente
  `// Fonction de sauvegarde automatique`


*... et 46 autres commentaires évidents.*

## JSDoc Manquantes (216)

- **src\actions\addressActions.ts:14** - function `addAddress` (async)
- **src\actions\addressActions.ts:87** - function `updateAddress` (async)
- **src\actions\addressActions.ts:160** - function `deleteAddress` (async)
- **src\actions\addressActions.ts:214** - function `getUserAddresses` (async)
- **src\actions\authActions.ts:33** - function `loginAction` (async)
- **src\actions\authActions.ts:126** - function `signUpAction` (async)
- **src\actions\authActions.ts:223** - function `requestPasswordResetAction` (async)
- **src\actions\authActions.ts:278** - function `updatePasswordAction` (async)
- **src\actions\authActions.ts:342** - function `resendConfirmationEmailAction` (async)
- **src\actions\authActions.ts:372** - function `logoutAction` (async)
- **src\actions\cartActions.ts:35** - function `addItemToCart` (async)
- **src\actions\cartActions.ts:138** - function `removeItemFromCart` (async)
- **src\actions\cartActions.ts:212** - function `updateCartItemQuantity` (async)
- **src\actions\cartActions.ts:270** - function `removeItemFromCartFormAction` (async)
- **src\actions\cartActions.ts:286** - function `updateCartItemQuantityFormAction` (async)


*... et 201 autres fonctions sans JSDoc.*

## Actions TODO/FIXME (32)

### Par Priorité
- **UNDEFINED**: 32 éléments

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
1. **Supprimer 66 commentaires évidents** (gain: 1.7%)
2. **Ajouter JSDoc à 216 fonctions publiques**
3. **Standardiser 32 TODOs sans date**

### Fichiers Prioritaires
- **src\actions\magazineActions.ts** (10 problèmes)
- **src\lib\magazine\queries.ts** (10 problèmes)
- **src\lib\actions\magazine-actions.ts** (9 problèmes)
- **src\services\cart.service.ts** (9 problèmes)
- **src\stores\cartStore.ts** (9 problèmes)
- **src\actions\authActions.ts** (7 problèmes)
- **src\actions\cartActions.ts** (7 problèmes)
- **src\lib\cart-helpers.ts** (6 problèmes)
- **src\stores\profileStore.ts** (6 problèmes)
- **src\stores\addressStore.ts** (5 problèmes)

### Prochaines Étapes
1. Exécuter le script de nettoyage: `node scripts/cleanup-obvious-comments.js`
2. Appliquer templates JSDoc: `node scripts/add-jsdoc-templates.js`
3. Standardiser TODOs: `node scripts/standardize-todos.js`

---
*Rapport généré automatiquement par audit-comments.js*
