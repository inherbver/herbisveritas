# Documentation Pipeline CI/CD - Phase 3.5

## Vue d'ensemble

Le pipeline CI/CD de HerbisVeritas implémente une stratégie de test complète avec parallélisation, couverture de code, et déploiement automatisé. L'objectif est d'atteindre et maintenir 75% de couverture de tests tout en garantissant la qualité et les performances.

## Architecture du Pipeline

### Jobs Principaux

#### 1. Setup & Cache
- **Rôle**: Installation des dépendances et mise en cache
- **Parallélisme**: Base pour tous les autres jobs
- **Optimisations**: Cache PNPM, génération de matrices de tests

#### 2. Lint & Static Analysis
- **Outils**: ESLint, TypeScript compiler, Next.js build
- **Outputs**: Rapports SARIF pour GitHub Security
- **Seuils**: Zéro erreur de lint, build successful

#### 3. Tests Unitaires (4 shards)
- **Parallélisation**: 4 workers simultanés
- **Couverture**: Rapports JSON par shard
- **Agrégation**: Fusion des rapports de couverture
- **Seuil**: 75% de couverture globale

#### 4. Tests E2E (Multi-browser)
- **Navigateurs**: Chromium, Firefox, WebKit
- **Tests**: checkout-flow, admin-dashboard, mobile-navigation
- **Parallélisme**: 9 jobs simultanés (3 browsers × 3 test files)

#### 5. Performance & Bundle Analysis
- **Lighthouse CI**: Core Web Vitals, accessibility
- **Bundle size**: Limite de 5MB total
- **Métriques**: FCP < 2s, LCP < 3s, CLS < 0.1

#### 6. Security Audit
- **Outils**: npm audit, Semgrep
- **Scope**: Dépendances, code source, patterns OWASP

### Tests Nocturnes Étendus

Le workflow `nightly-tests.yml` exécute des tests approfondis:

- **Compatibilité navigateurs**: Tests sur différentes résolutions
- **Performance approfondie**: Analyse de bundle, tests mémoire
- **Sécurité avancée**: OWASP ZAP, Snyk, Semgrep étendu
- **Tests visuels**: Régression des captures d'écran
- **Tests de stress**: Artillery pour les endpoints critiques
- **Accessibilité**: axe-core et Pa11y pour WCAG

## Configuration de Parallélisation

### Tests Unitaires (Jest)
```bash
# Division en 4 shards pour optimiser le temps d'exécution
jest --shard=1/4 --coverage --maxWorkers=50%
jest --shard=2/4 --coverage --maxWorkers=50%
jest --shard=3/4 --coverage --maxWorkers=50%
jest --shard=4/4 --coverage --maxWorkers=50%
```

### Tests E2E (Playwright)
```bash
# Parallélisation par navigateur et fichier de test
playwright test --project=chromium tests/e2e/checkout-flow.spec.ts
playwright test --project=firefox tests/e2e/admin-dashboard.spec.ts
playwright test --project=webkit tests/e2e/mobile-navigation.spec.ts
```

## Métriques et Seuils

### Couverture de Code
- **Global**: 75% minimum (statements, branches, functions, lines)
- **Modules critiques**: 90% minimum
  - `src/actions/` (Server Actions)
  - `src/services/` (Business logic)
  - `src/lib/auth/` (Authentication)
  - `src/lib/storage/` (File handling)
  - `src/lib/stripe/` (Payment processing)

### Performance
- **First Contentful Paint**: < 2s
- **Largest Contentful Paint**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Total Blocking Time**: < 300ms
- **Bundle size**: < 5MB total

### Qualité
- **ESLint**: 0 erreurs
- **TypeScript**: 0 erreurs de compilation
- **Security audit**: 0 vulnérabilités critiques/élevées

## Scripts et Outils

### Script de Vérification de Couverture
`scripts/test-coverage-check.js` fournit:
- Analyse détaillée de la couverture
- Identification des modules critiques sous-couverts
- Génération de badges de couverture
- Recommandations d'amélioration

### Configuration Jest Optimisée
`jest.config.js` inclut:
- Support des shards pour parallélisation
- Reporters adaptés pour CI (JUnit, HTML)
- Seuils de couverture configurables
- Cache optimisé pour performances

### Configuration Playwright Avancée
`playwright.config.ts` offre:
- Multi-browser testing
- Reporters adaptés (HTML, JSON, JUnit, GitHub)
- Configuration différentielle CI/Local
- Support mobile et desktop

## Déploiement Conditionnel

### Environnements
- **Preview**: Déploiement automatique sur `develop`
- **Production**: Déploiement manuel après validation
- **Feature branches**: Previews temporaires

### Conditions de Déploiement
- ✅ Tous les tests passent
- ✅ Couverture ≥ 75%
- ✅ Performance dans les budgets
- ✅ Sécurité validée
- ✅ Build successful

## Monitoring et Notifications

### Artefacts Conservés
- **Rapports de tests**: 7 jours
- **Couverture de code**: 30 jours
- **Rapports Lighthouse**: 30 jours
- **Logs de sécurité**: 90 jours

### Notifications
- **Slack**: Résultats des tests nocturnes
- **GitHub**: Status checks sur PRs
- **Email**: Échecs critiques sur main/develop

## Variables d'Environnement Requises

### Tests
```env
NEXT_PUBLIC_SUPABASE_URL_TEST=<url_supabase_test>
NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST=<clé_anonyme_test>
SUPABASE_SERVICE_ROLE_KEY_TEST=<clé_service_test>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=<clé_publique_stripe_test>
STRIPE_SECRET_KEY_TEST=<clé_secrète_stripe_test>
```

### CI/CD
```env
SLACK_WEBHOOK_URL=<webhook_slack>
SNYK_TOKEN=<token_snyk>
CODECOV_TOKEN=<token_codecov>
```

## Utilisation Locale

### Commandes Disponibles
```bash
# Tests complets
npm run test:all

# Tests avec couverture
npm run test:coverage:check

# Tests E2E avec interface
npm run test:e2e:ui

# Tests unitaires en watch mode
npm run test:watch

# Tests E2E headed mode
npm run test:e2e:headed
```

### Configuration IDE
- **VSCode**: Extensions Jest et Playwright recommandées
- **Debug**: Configuration pour tests unitaires et E2E
- **Coverage**: Affichage dans l'éditeur avec Coverage Gutters

## Optimisations Performances

### Cache Strategy
- **Dependencies**: Cache PNPM global
- **Jest**: Cache local avec répertoire dédié
- **Playwright**: Cache des browsers
- **Next.js**: Cache de build

### Parallélisation
- **Workers Jest**: 50% en CI, 100% en local
- **Shards**: Division intelligente des tests
- **Matrix strategy**: Exécution simultanée multi-environnements

## Troubleshooting

### Problèmes Fréquents

#### Tests flaky
- **Solution**: Augmenter timeouts, améliorer les sélecteurs
- **Monitoring**: Retry automatique avec artifacts

#### Couverture insuffisante
- **Solution**: Identifier avec `test-coverage-check.js`
- **Action**: Prioriser modules critiques

#### Performance dégradée
- **Solution**: Analyzer bundle, optimiser imports
- **Monitoring**: Lighthouse CI avec seuils stricts

#### Échecs de sécurité
- **Solution**: Mise à jour dépendances, review code
- **Prevention**: Audit quotidien automatisé

Cette architecture garantit une qualité élevée du code tout en maintenant une vélocité de développement optimale grâce à la parallélisation et aux optimisations de cache.