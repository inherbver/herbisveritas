# Tests E2E Admin Dashboard

Suite complète de tests end-to-end pour le dashboard administrateur de In Herbis Veritas.

## 📋 Vue d'ensemble

Ces tests vérifient toutes les fonctionnalités CRUD du dashboard admin :
- **Dashboard** : Navigation, accès, logs d'activité
- **Produits** : Création, édition, suppression, gestion du stock
- **Utilisateurs** : Gestion des rôles, permissions, suspension
- **Commandes** : Traitement, remboursements, expédition
- **Magazine** : Articles, catégories, SEO, commentaires

## 🚀 Exécution des tests

### Prérequis
```bash
# Installer Playwright
npx playwright install

# S'assurer que le serveur de développement est lancé
npm run dev
```

### Commandes disponibles

```bash
# Exécuter tous les tests admin
npm run test:e2e:admin

# Exécuter un test spécifique
npm run test:admin:dashboard     # Tests du dashboard
npm run test:admin:products      # Tests CRUD produits
npm run test:admin:users        # Tests gestion utilisateurs
npm run test:admin:orders       # Tests gestion commandes
npm run test:admin:magazine     # Tests contenu magazine

# Mode debug (avec interface)
npm run test:e2e:debug

# Mode headed (voir le navigateur)
npm run test:e2e:headed

# Interface utilisateur Playwright
npm run test:e2e:ui

# Voir le rapport après exécution
npm run test:e2e:report
```

## 📝 Structure des tests

### `admin-dashboard.spec.ts`
- ✅ Accès au dashboard admin
- ✅ Navigation entre les sections
- ✅ Affichage des logs d'activité
- ✅ Gestion des accès non autorisés
- ✅ Vue mobile responsive
- ✅ Performance et temps de chargement

### `admin-products-crud.spec.ts`
- ✅ Listing des produits avec pagination
- ✅ Création de nouveau produit
- ✅ Édition de produit existant
- ✅ Gestion du stock
- ✅ Activation/désactivation
- ✅ Suppression de produit
- ✅ Opérations en masse
- ✅ Upload d'images
- ✅ Validation des formulaires
- ✅ Tri et filtrage

### `admin-users-crud.spec.ts`
- ✅ Listing des utilisateurs
- ✅ Recherche et filtrage
- ✅ Détails utilisateur
- ✅ Modification des rôles
- ✅ Suspension/réactivation
- ✅ Export des données
- ✅ Gestion des permissions
- ✅ Envoi d'emails
- ✅ Journal d'activité
- ✅ Import CSV

### `admin-orders-crud.spec.ts`
- ✅ Dashboard des commandes avec stats
- ✅ Détails de commande
- ✅ Mise à jour du statut
- ✅ Traitement des remboursements
- ✅ Génération d'étiquettes d'expédition
- ✅ Envoi d'emails de confirmation
- ✅ Filtrage par statut/date
- ✅ Export des commandes
- ✅ Impression de factures
- ✅ Notes internes et timeline

### `admin-magazine-crud.spec.ts`
- ✅ Listing des articles
- ✅ Création/édition d'articles
- ✅ Prévisualisation
- ✅ Gestion des statuts
- ✅ Publication programmée
- ✅ Suppression d'articles
- ✅ Gestion des catégories
- ✅ Modération des commentaires
- ✅ Paramètres SEO
- ✅ Analytics et métriques

## 🔐 Configuration

### Identifiants de test
```javascript
const ADMIN_EMAIL = "inherbver@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
```

### Base URL
```javascript
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3003";
```

## 🎯 Meilleures pratiques

### Helpers réutilisables
```typescript
// Helper de connexion admin
async function loginAsAdmin(page: Page) {
  await page.goto("/fr/login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/shop");
}

// Génération d'identifiants uniques
function generateUniqueId() {
  return randomBytes(4).toString("hex");
}
```

### Sélecteurs recommandés
- Préférer `data-testid` pour les éléments critiques
- Utiliser `getByRole` pour l'accessibilité
- `getByText` pour le contenu visible
- Éviter les sélecteurs CSS fragiles

### Assertions
```typescript
// Vérifier la visibilité
await expect(element).toBeVisible();

// Vérifier le texte
await expect(element).toContainText("texte");

// Vérifier l'URL
await expect(page).toHaveURL(/pattern/);

// Vérifier le nombre d'éléments
await expect(elements).toHaveCount(5);
```

## 🐛 Debugging

### Mode debug
```bash
# Lance les tests avec l'interface de debug
npm run test:e2e:debug
```

### Screenshots en cas d'échec
Les screenshots sont automatiquement capturés en cas d'échec et stockés dans `test-results/`.

### Traces
Les traces sont générées pour les tests échoués :
```bash
# Voir la trace
npx playwright show-trace test-results/*/trace.zip
```

## 📊 Rapports

### Génération automatique
Les rapports HTML sont générés après chaque exécution :
```bash
npm run test:e2e:report
```

### CI/CD
Configuration optimisée pour l'intégration continue :
- Reporters : HTML, JSON, JUnit, GitHub
- Retry automatique en cas d'échec
- Parallélisation des tests

## 🔄 Maintenance

### Mise à jour des sélecteurs
Si l'interface change, mettre à jour les sélecteurs dans les tests concernés.

### Ajout de nouveaux tests
1. Créer un nouveau fichier `.spec.ts` dans `tests/admin/`
2. Suivre la structure existante
3. Ajouter un script npm si nécessaire
4. Documenter dans ce README

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev/docs)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Assertions](https://playwright.dev/docs/test-assertions)
- [Locators](https://playwright.dev/docs/locators)