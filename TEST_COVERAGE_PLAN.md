# Plan de Couverture de Tests - HerbisVeritas

## 📊 Objectif : 75% de Couverture Globale

### État Actuel : ~15%

### Objectif Final : 75%

### Délai Estimé : 4-6 semaines

---

## 🎯 Phase 1 : Services Critiques de Paiement (Semaine 1)

**Objectif : 0% → 90% | Impact : CRITIQUE**

### 1.1 Stripe Integration (0% → 95%)

```typescript
// Fichiers à tester
src/lib/stripe/
├── index.ts
├── client.ts
├── webhooks.ts
└── checkout.ts

// Tests à créer
- Création de sessions de paiement
- Validation des webhooks
- Gestion des erreurs Stripe
- Tests des différents modes de paiement
- Remboursements et annulations
```

### 1.2 Checkout Service (12% → 90%)

```typescript
// Tests manquants
- Validation complète du panier avant paiement
- Calcul des frais de livraison par zone
- Application des codes promo
- Gestion des stocks pendant checkout
- Rollback en cas d'échec
```

### 1.3 Tests d'Intégration Paiement

```typescript
// Scénarios E2E
- Paiement réussi avec carte
- Échec de paiement (fonds insuffisants)
- Paiement avec 3D Secure
- Webhook de confirmation
- Timeout et retry logic
```

**Couverture attendue après Phase 1 : ~25%**

---

## 🔐 Phase 2 : Actions Serveur Critiques (Semaine 2)

**Objectif : 5-9% → 85% | Impact : ÉLEVÉ**

### 2.1 Cart Actions (5% → 90%)

```typescript
// Tests à implémenter
describe('cartActions', () => {
  // Gestion du panier utilisateur
  - addToCartAction avec validation stock
  - removeFromCartAction avec nettoyage
  - updateQuantityAction avec limites
  - mergeGuestCart après login
  - clearCartAction avec confirmation

  // Gestion des erreurs
  - Produit indisponible
  - Quantité excessive
  - Session expirée
  - Conflits de concurrence
});
```

### 2.2 Auth Actions (9% → 90%)

```typescript
// Tests à implémenter
describe('authActions', () => {
  // Authentification
  - signUpAction avec validation email
  - signInAction avec rate limiting
  - signOutAction avec cleanup
  - forgotPasswordAction avec token
  - resetPasswordAction avec expiration

  // Sécurité
  - Protection CSRF
  - Validation des tokens JWT
  - Rate limiting
  - Session management
});
```

### 2.3 Address Actions (0% → 80%)

```typescript
// Tests à créer
- CRUD adresses avec validation
- Géolocalisation et validation postale
- Adresses par défaut
- Limites par utilisateur
```

### 2.4 Product Actions (0% → 80%)

```typescript
// Tests à créer
- Recherche et filtrage produits
- Gestion des favoris
- Historique de consultation
- Recommandations
```

**Couverture attendue après Phase 2 : ~40%**

---

## 📦 Phase 3 : Stores et État Global (Semaine 3)

**Objectif : 41% → 80% | Impact : MOYEN**

### 3.1 Cart Store (41% → 80%)

```typescript
// Tests manquants
- Optimistic updates
- Persistence localStorage
- Sync avec backend
- Gestion offline
- Mémoisation et performance
```

### 3.2 Profile Store (15% → 75%)

```typescript
// Tests à ajouter
- État de connexion
- Mise à jour profil
- Préférences utilisateur
- Gestion des erreurs
```

### 3.3 Address Store (76% → 85%)

```typescript
// Finalisation
- Edge cases
- Validation complète
- Tests de performance
```

**Couverture attendue après Phase 3 : ~55%**

---

## ✅ Phase 4 : Validateurs et Sécurité (Semaine 4)

**Objectif : 11% → 85% | Impact : ÉLEVÉ**

### 4.1 Product Validator

```typescript
// Validation complète
- Schémas Zod complets
- Validation des images
- SEO et slugs
- Prix et promotions
- Stock et disponibilité
```

### 4.2 Address Validator

```typescript
// Validation approfondie
- Formats internationaux
- Codes postaux par pays
- Validation téléphone
- Caractères spéciaux
```

### 4.3 Profile Validator

```typescript
// Sécurité renforcée
- Validation email
- Force mot de passe
- XSS prevention
- SQL injection protection
```

**Couverture attendue après Phase 4 : ~65%**

---

## 🚀 Phase 5 : Tests d'Intégration E2E (Semaine 5)

**Objectif : Tests critiques | Impact : CRITIQUE**

### 5.1 Parcours Achat Complet

```typescript
// playwright/tests/checkout.spec.ts
test("Parcours achat complet", async ({ page }) => {
  // 1. Navigation catalogue
  await page.goto("/products");
  await page.click('[data-testid="product-1"]');

  // 2. Ajout au panier
  await page.click('[data-testid="add-to-cart"]');
  await expect(page.locator(".cart-count")).toHaveText("1");

  // 3. Checkout
  await page.goto("/checkout");
  await page.fill('[name="email"]', "test@example.com");

  // 4. Paiement
  await page.fill('[data-testid="card-number"]', "4242424242424242");
  await page.click('[data-testid="pay-button"]');

  // 5. Confirmation
  await expect(page).toHaveURL(/\/order-confirmation/);
});
```

### 5.2 Parcours Authentification

```typescript
// Tests critiques auth
- Inscription avec email
- Connexion avec erreurs
- Reset password flow
- OAuth providers
- 2FA si implémenté
```

### 5.3 Tests de Sécurité

```typescript
// Security testing
- Injection SQL
- XSS attempts
- CSRF tokens
- Rate limiting
- Permissions et rôles
```

**Couverture attendue après Phase 5 : ~75%**

---

## 📈 Phase 6 : Optimisation et Monitoring (Semaine 6)

**Objectif : Maintien 75%+ | Impact : CONTINU**

### 6.1 Tests de Performance

```typescript
// Performance benchmarks
- Temps de chargement < 3s
- Time to Interactive < 5s
- Bundle size limits
- Database query optimization
```

### 6.2 Tests de Régression

```typescript
// Regression suite
- Snapshot testing pour UI
- Visual regression testing
- API contract testing
- Database migration tests
```

### 6.3 Monitoring Continu

```typescript
// CI/CD Integration
- Pre-commit hooks
- GitHub Actions avec seuils
- Coverage reports automatiques
- Alertes sur baisse de couverture
```

---

## 🔧 Outils et Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    "./src/lib/stripe/": {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95,
    },
    "./src/actions/": {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
};
```

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          fail_ci_if_error: true
          threshold: 75
```

---

## 📊 Métriques de Succès

### KPIs Principaux

- **Couverture Globale** : 75%+
- **Chemins Critiques** : 95%+
- **Bugs en Production** : -60%
- **Temps de Déploiement** : -40%
- **Confiance Équipe** : +80%

### Métriques Secondaires

- **Mutation Score** : 70%+
- **Complexité Cyclomatique Testée** : 100% si > 5
- **Tests E2E Pass Rate** : 98%+
- **Performance Tests** : < 3s page load

---

## 🚦 Prochaines Étapes Immédiates

1. **Aujourd'hui** : Commencer Phase 1.1 (Stripe tests)
2. **Cette semaine** : Compléter Phase 1 (Paiements)
3. **Semaine 2** : Phase 2 (Actions)
4. **Review hebdomadaire** : Ajuster le plan selon progression

---

## 💡 Best Practices à Suivre

### Pour chaque test

- ✅ Arrange, Act, Assert pattern
- ✅ Un seul concept par test
- ✅ Noms descriptifs
- ✅ Isolation complète
- ✅ Données de test réalistes

### Pour la maintenance

- 📝 Documentation des tests complexes
- 🔄 Refactoring régulier
- 🎯 Focus sur la valeur métier
- 🚀 Performance des tests < 5 min
- 📊 Rapports de couverture hebdomadaires

---

## 🎉 Conclusion

Avec ce plan structuré, nous passerons de 15% à 75% de couverture en 6 semaines, en priorisant :

1. **Sécurité** : Paiements et authentification
2. **Fiabilité** : Actions serveur critiques
3. **Expérience** : Parcours utilisateur E2E
4. **Maintenabilité** : Tests automatisés et CI/CD

Le ROI sera visible dès la Phase 2 avec une réduction significative des bugs en production.
