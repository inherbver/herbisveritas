# Rapport de Couverture des Commentaires HerbisVeritas

📊 **Généré le**: 16/08/2025 à 01:53:50  
⏱️ **Temps d'exécution**: 84ms  
🎯 **Seuil minimum**: 80%

## Vue d'Ensemble

| Métrique | Valeur | Statut |
|----------|--------|--------|
| **Couverture globale** | 38.2% | ❌ |
| **Qualité moyenne** | 15.4/100 | ❌ |
| **Fichiers analysés** | 329 | ℹ️ |
| **Fonctions totales** | 374 | ℹ️ |
| **Fonctions documentées** | 143 | ℹ️ |

## Couverture par Type

| Type | Fonctions | Documentées | Couverture | Statut |
|------|-----------|-------------|------------|--------|
| **Server Actions** | 0 | 0 | 100% | ✅ |
| **Composants React** | 0 | 0 | 100% | ✅ |
| **Hooks** | 17 | 10 | 58.8% | ❌ |

## Distribution des Fichiers

- **✅ Au-dessus du seuil (80%)**: 197 fichiers
- **❌ En-dessous du seuil**: 132 fichiers

## Fichiers à Améliorer (132)

- **src\actions\addressActions.ts** - 0.0% (0/4)
- **src\actions\authActions.ts** - 0.0% (0/6)
- **src\actions\cartActions.ts** - 0.0% (0/7)
- **src\actions\magazineActions.ts** - 0.0% (0/8)
- **src\actions\productActions.ts** - 0.0% (0/3)
- **src\app\api\admin\check-admins\route.ts** - 0.0% (0/1)
- **src\app\not-found.tsx** - 0.0% (0/1)
- **src\app\[locale]\about\page.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\layout.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\markets\market-form.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\newsletter\page.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\orders\components\OrdersTable.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\orders\components\OrderStatsCards.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\partners\partner-form.tsx** - 0.0% (0/1)
- **src\app\[locale]\admin\products\data-table.tsx** - 0.0% (0/1)

## Top 10 - Meilleure Couverture

1. **src\actions\marketActions.ts** - 100.0% (qualité: 60.8)
2. **src\actions\newsletterActions.ts** - 100.0% (qualité: 50.0)
3. **src\actions\orderActions.ts** - 100.0% (qualité: 65.0)
4. **src\actions\partnerActions.ts** - 100.0% (qualité: 61.9)
5. **src\actions\stripeActions.ts** - 100.0% (qualité: 60.0)
6. **src\app\api\admin\memory-cleanup\route.ts** - 100.0% (qualité: 52.5)
7. **src\app\api\colissimo-token\route.ts** - 100.0% (qualité: 65.0)
8. **src\app\api\stripe-webhook\route.ts** - 100.0% (qualité: 35.0)
9. **src\components\auth\can-server.tsx** - 100.0% (qualité: 90.0)
10. **src\components\auth\Can.tsx** - 100.0% (qualité: 65.0)

## Analyse Détaillée par Fichier

### src\actions\addressActions.ts
- **Couverture**: 0.0% (0/4)
- **Qualité**: 0.0/100
- **Type**: utility

**Fonctions non documentées:**
- `addAddress` (ligne 14)
- `updateAddress` (ligne 87)
- `deleteAddress` (ligne 160)

### src\actions\authActions.ts
- **Couverture**: 0.0% (0/6)
- **Qualité**: 0.0/100
- **Type**: utility

**Fonctions non documentées:**
- `loginAction` (ligne 33)
- `signUpAction` (ligne 126)
- `requestPasswordResetAction` (ligne 223)

### src\actions\cartActions.ts
- **Couverture**: 0.0% (0/7)
- **Qualité**: 0.0/100
- **Type**: utility

**Fonctions non documentées:**
- `addItemToCart` (ligne 35)
- `removeItemFromCart` (ligne 138)
- `updateCartItemQuantity` (ligne 212)

### src\actions\magazineActions.ts
- **Couverture**: 0.0% (0/8)
- **Qualité**: 0.0/100
- **Type**: utility

**Fonctions non documentées:**
- `createArticle` (ligne 108)
- `updateArticle` (ligne 217)
- `deleteArticle` (ligne 328)

### src\actions\productActions.ts
- **Couverture**: 0.0% (0/3)
- **Qualité**: 0.0/100
- **Type**: utility

**Fonctions non documentées:**
- `getProducts` (ligne 294)
- `getProductBySlug` (ligne 367)
- `toggleProductStatus` (ligne 414)


## Recommandations

🎯 **Priorité 1**: Atteindre 80% de couverture globale (actuellement 38.2%)
📝 **Priorité 2**: Améliorer la qualité des JSDoc existantes
📊 **Priorité 2**: Traiter les 132 fichiers sous le seuil
🔄 **Amélioration continue**: Configurer pre-commit hooks pour maintenir la qualité
📈 **Monitoring**: Suivre l'évolution des métriques dans le temps

## Progression dans le Temps

*Fonctionnalité à venir: Analyse des tendances sur plusieurs commits*

Pour activer le suivi des tendances:
1. Exécuter ce script après chaque commit majeur
2. Stocker les résultats dans `docs/coverage-history.json`
3. Générer graphiques d'évolution

---
*Rapport généré automatiquement par comment-coverage.js*
