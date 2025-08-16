# Rapport de Validation JSDoc HerbisVeritas

📊 **Généré le**: 16/08/2025 à 01:53:45  
⏱️ **Temps d'exécution**: 101ms  
📁 **Répertoire analysé**: src/

## Score de Qualité JSDoc

🎯 **Score global**: 40.9/100

| Métrique | Valeur |
|----------|--------|
| **Fonctions analysées** | 358 |
| **Fonctions avec JSDoc** | 142 |
| **Taux de documentation** | 39.7% |
| **Taux d'erreur** | 181.3% |
| **Erreurs par fonction (moyenne)** | 1.81 |

## Résumé des Problèmes

| Type | Nombre | Priorité |
|------|--------|----------|
| **Erreurs** | 649 | 🔴 Critique |
| **Avertissements** | 1 | 🟡 Important |
| **Suggestions** | 335 | 🔵 Amélioration |

## Erreurs Critiques (649)

- **src\actions\addressActions.ts:14** - `addAddress` Fonction 'addAddress' sans JSDoc
- **src\actions\addressActions.ts:87** - `updateAddress` Fonction 'updateAddress' sans JSDoc
- **src\actions\addressActions.ts:160** - `deleteAddress` Fonction 'deleteAddress' sans JSDoc
- **src\actions\addressActions.ts:214** - `getUserAddresses` Fonction 'getUserAddresses' sans JSDoc
- **src\actions\authActions.ts:33** - `loginAction` Fonction 'loginAction' sans JSDoc
- **src\actions\authActions.ts:126** - `signUpAction` Fonction 'signUpAction' sans JSDoc
- **src\actions\authActions.ts:223** - `requestPasswordResetAction` Fonction 'requestPasswordResetAction' sans JSDoc
- **src\actions\authActions.ts:278** - `updatePasswordAction` Fonction 'updatePasswordAction' sans JSDoc
- **src\actions\authActions.ts:342** - `resendConfirmationEmailAction` Fonction 'resendConfirmationEmailAction' sans JSDoc
- **src\actions\authActions.ts:372** - `logoutAction` Fonction 'logoutAction' sans JSDoc
- **src\actions\cartActions.ts:35** - `addItemToCart` Fonction 'addItemToCart' sans JSDoc
- **src\actions\cartActions.ts:138** - `removeItemFromCart` Fonction 'removeItemFromCart' sans JSDoc
- **src\actions\cartActions.ts:212** - `updateCartItemQuantity` Fonction 'updateCartItemQuantity' sans JSDoc
- **src\actions\cartActions.ts:270** - `removeItemFromCartFormAction` Fonction 'removeItemFromCartFormAction' sans JSDoc
- **src\actions\cartActions.ts:286** - `updateCartItemQuantityFormAction` Fonction 'updateCartItemQuantityFormAction' sans JSDoc

## Avertissements (1)

- **src\lib\cart-helpers.ts:84** - `transformServerCartToClientItems` Description évidente qui pourrait être améliorée

## Suggestions d'Amélioration (335)

- **src\actions\marketActions.ts:34** - `createMarket` Tag recommandé: @example
- **src\actions\marketActions.ts:34** - `createMarket` Tag recommandé: @throws
- **src\actions\marketActions.ts:34** - `createMarket` Tag @performance recommandé pour fonction async
- **src\actions\marketActions.ts:107** - `updateMarket` Tag recommandé: @example
- **src\actions\marketActions.ts:107** - `updateMarket` Tag recommandé: @throws
- **src\actions\marketActions.ts:107** - `updateMarket` Tag @performance recommandé pour fonction async
- **src\actions\marketActions.ts:178** - `deleteMarket` Tag recommandé: @example
- **src\actions\marketActions.ts:178** - `deleteMarket` Tag recommandé: @throws
- **src\actions\marketActions.ts:178** - `deleteMarket` Tag @performance recommandé pour fonction async
- **src\actions\marketActions.ts:249** - `getMarkets` Tag recommandé: @example

## Analyse par Type de Problème

### Erreurs par Type
- **MISSING_REQUIRED_TAG**: 246
- **MISSING_JSDOC**: 216
- **MISSING_PARAM_DOC**: 176
- **EXTRA_PARAM_DOC**: 7
- **INSUFFICIENT_DESCRIPTION**: 4

### Suggestions par Type
- **SUGGESTED_TAG**: 283
- **MISSING_PERFORMANCE_TAG**: 52



## Actions Recommandées

### Priorité 1 - Erreurs Critiques
- **Ajouter JSDoc complète** (216 occurrences)
- **Compléter tags requis** (246 occurrences)
- **Documenter paramètres** (176 occurrences)
- **Améliorer descriptions** (4 occurrences)
- **Nettoyer documentation paramètres** (7 occurrences)

### Priorité 2 - Améliorations
- **Améliorer qualité descriptions** (1 occurrences)

### Priorité 3 - Optimisations
- **Corriger problème** (283 occurrences)
- **Corriger problème** (52 occurrences)

## Fichiers à Traiter en Priorité

- **src\lib\stripe\utils.ts** (99 problèmes)
- **src\utils\formatters.ts** (56 problèmes)
- **src\lib\markets\transformers.ts** (54 problèmes)
- **src\actions\partnerActions.ts** (48 problèmes)
- **src\actions\orderActions.ts** (36 problèmes)
- **src\actions\marketActions.ts** (35 problèmes)
- **src\components\common\optimized-image.tsx** (30 problèmes)
- **src\actions\newsletterActions.ts** (29 problèmes)
- **src\lib\magazine\publication-utils.ts** (28 problèmes)
- **src\lib\auth\admin-service.ts** (27 problèmes)

---
*Rapport généré automatiquement par validate-jsdoc.js*
