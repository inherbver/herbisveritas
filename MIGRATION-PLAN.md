# 🏗️ PLAN DE MIGRATION ARCHITECTURAL - HERBISVERITAS

## Transition vers Clean Architecture avec DDD Patterns

### 📊 VUE D'ENSEMBLE

**Durée totale estimée:** 17-25 jours  
**Équipe:** Développeurs actifs + 1 architecte  
**Risque:** MOYEN (migration incrémentale avec rollback)

---

## 🎯 PHASE 1: CONSOLIDATION DOMAIN LAYER (3-5 jours)

### Objectifs

- ✅ Consolider les entités métier existantes
- ✅ Finaliser les value objects et repositories interfaces
- ✅ Valider la logique métier pure

### Actions détaillées

#### Jour 1-2: Consolidation des entités

```bash
# Exécuter la migration de base
node migration-scripts/02-phase-scripts.cjs phase1

# Vérifications manuelles nécessaires
# 1. Revoir Cart.entity.ts pour la logique métier
# 2. Créer Product.entity.ts manquant
# 3. Créer User.entity.ts avec les règles métier
```

#### Jour 2-3: Value Objects complets

- Finaliser `Money`, `Quantity`, `ProductReference`
- Créer `Address`, `Email`, `UserId` value objects
- Tests unitaires pour chaque VO

#### Jour 3-4: Repository Interfaces

- Consolider toutes les interfaces dans `/domain/repositories/`
- Vérifier la cohérence des méthodes
- Documentation des contrats

#### Jour 4-5: Services Domain

- Migrer et valider les services métier purs
- Séparer logique métier de l'infrastructure
- Tests unitaires complets

### ✅ Critères de validation Phase 1

```bash
# Validation automatique
node migration-scripts/02-phase-scripts.cjs validate1

# Validation manuelle
# ✅ Aucun import infrastructure dans /domain/
# ✅ Tests domain passent à 100%
# ✅ Entités avec logique métier complète
# ✅ Value objects immutables et validés
```

### 🚨 Points de rollback

- Commit après chaque entité migrée
- Tests domain isolés et fonctionnels
- Backup de la structure originale

### ⚠️ État des Scripts Migration

**STATUT:** ✅ Scripts corrigés et prêts (v1.1)

**Corrections appliquées:**

- ✅ Dépendance `glob` ajoutée (v11.0.3)
- ✅ Erreurs template literal corrigées
- ✅ Logique `calculateNewImportPath` implémentée
- ✅ Validation existence fichiers ajoutée
- ✅ Gestion d'erreurs robuste avec timeouts

---

## 🏗️ PHASE 2: INFRASTRUCTURE → ADAPTERS (5-7 jours)

### Objectifs

- 🔄 Déplacer tous les services infrastructure vers `/adapters/`
- 🔧 Implémenter les interfaces domain
- 📊 Migrer le système d'événements

### Actions détaillées

#### Jour 1-2: Migration Repositories

```bash
# Migration automatique
node migration-scripts/02-phase-scripts.cjs phase2

# Actions manuelles requises:
# 1. Vérifier implémentation des interfaces domain
# 2. Tester chaque repository migré
# 3. Mise à jour imports dans services
```

#### Jour 2-4: Services Infrastructure

- Migration article-\*.service.ts vers `/adapters/services/`
- Réorganisation selon responsabilités
- Tests d'intégration avec Supabase

#### Jour 4-6: Système d'événements

- Migration event-bus, event-store vers `/adapters/events/`
- Tests handlers et listeners
- Performance et stabilité

#### Jour 6-7: Correction imports

```bash
# Correction automatique des imports
node migration-scripts/03-import-fixer.cjs full
```

### ✅ Critères de validation Phase 2

```bash
node migration-scripts/02-phase-scripts.cjs validate2
npm run build  # Doit passer sans erreur
npm test       # Tests infrastructure doivent passer
```

### 🚨 Points de rollback

- Sauvegarde complète avant migration services
- Validation build après chaque lot de migration
- Tests d'intégration maintenus

---

## 💼 PHASE 3: APPLICATION LAYER (4-6 jours)

### Objectifs

- 🎯 Créer la couche Use Cases
- 🔧 Migrer services applicatifs
- 📋 Implémenter CQRS patterns

### Actions détaillées

#### Jour 1-2: Structure Use Cases

```bash
node migration-scripts/02-phase-scripts.cjs phase3

# Création manuelle des use cases principaux:
# - CreateUserUseCase
# - AddToCartUseCase
# - PlaceOrderUseCase
# - PublishArticleUseCase
```

#### Jour 2-4: Services Applicatifs

- Migration des services de `/lib/services/`
- Séparation logique applicative vs métier
- Orchestration des repositories et domain services

#### Jour 4-5: Commands/Queries (CQRS)

- Implémentation pattern Command/Query
- Handlers pour chaque cas d'usage
- Validation et error handling

#### Jour 5-6: Tests Application Layer

```bash
# Structure des tests
node migration-scripts/04-test-migrator.cjs init
```

### ✅ Critères de validation Phase 3

```bash
node migration-scripts/02-phase-scripts.cjs validate3

# Validation manuelle:
# ✅ Use cases testés et fonctionnels
# ✅ Services applicatifs découplés
# ✅ CQRS pattern implémenté
# ✅ Aucune dépendance directe vers adapters
```

---

## 🎨 PHASE 4: PRESENTATION LAYER (2-3 jours)

### Objectifs

- 📱 Réorganiser les composants React
- 🚀 Migrer actions vers controllers
- 📝 Implémenter DTOs

### Actions détaillées

#### Jour 1: Migration Actions → Controllers

```bash
# Migration des Server Actions
cp -r src/actions/* src/presentation/controllers/
```

#### Jour 1-2: Réorganisation Composants

- Structure `/presentation/components/` par domaine
- Séparation composants métier vs UI
- Props typées avec DTOs

#### Jour 2-3: DTOs et Validation

- Création DTOs pour API
- Validation Zod intégrée
- Tests composants critiques

### ✅ Critères de validation Phase 4

```bash
npm run build
npm run lint
# ✅ Build Next.js sans erreur
# ✅ Composants organisés logiquement
# ✅ DTOs bien typés
```

---

## 🧪 PHASE 5: TESTS & CONSOLIDATION (3-4 jours)

### Objectifs

- 📋 Migration complète des tests
- 🔧 Configuration Jest optimisée
- 📊 Coverage et qualité

### Actions détaillées

#### Jour 1: Migration Tests

```bash
# Migration automatique
node migration-scripts/04-test-migrator.cjs full
node migration-scripts/04-test-migrator.cjs execute-migration
```

#### Jour 1-2: Fix Configuration

```bash
# Fix Jest pour ESM
node migration-scripts/04-test-migrator.cjs fix-jest
npm install --save-dev jest-junit
```

#### Jour 2-3: Tests par Couche

- Tests unitaires domain (isolated)
- Tests intégration adapters
- Tests e2e critiques

#### Jour 3-4: Qualité et Performance

```bash
# Validation finale
node migration-scripts/04-test-migrator.cjs validate
npm run test
npm run build
```

### ✅ Critères de validation Phase 5

```bash
# ✅ Tous les tests passent
# ✅ Coverage > 80% sur domain/application
# ✅ Build production fonctionnel
# ✅ Performance maintenue
```

---

## 🔒 GESTION DES RISQUES

### 🚨 Points de Rollback Identifiés

1. **Après Phase 1:** Domain layer stable
2. **Après Phase 2:** Infrastructure migrée et testée
3. **Après Phase 3:** Application layer fonctionnelle
4. **Avant Phase 4:** Backup complet avant UI changes

### 📊 Monitoring Migration

```bash
# Surveillance continue
npm run build    # Doit toujours passer
npm test        # Suivi régression
npm run lint    # Qualité code maintenue
```

### 🔄 Procédure Rollback

```bash
# En cas de problème critique
git checkout main
git branch migration-rollback-$(date +%Y%m%d)
# Analyser rollback-log pour actions spécifiques
```

---

## ⚡ SCRIPTS D'EXÉCUTION RAPIDE

### Démarrage Migration

```bash
# 1. Préparation
npm install
node migration-scripts/01-migration-utils.cjs init
node migration-scripts/01-migration-utils.cjs plan

# 2. Phase 1 - Domain
node migration-scripts/02-phase-scripts.cjs phase1
npm test src/domain

# 3. Phase 2 - Adapters
node migration-scripts/02-phase-scripts.cjs phase2
node migration-scripts/03-import-fixer.cjs full

# 4. Phase 3 - Application
node migration-scripts/02-phase-scripts.cjs phase3

# 5. Phase 4 - Présentation (manuel)

# 6. Phase 5 - Tests
node migration-scripts/04-test-migrator.cjs full
```

### Validation Continue

```bash
# Après chaque phase
npm run build && npm test && npm run lint
```

---

## 📈 TIMELINE ET RESOURCES

### Planning Réaliste

| Phase   | Durée | Développeur Lead | Support    |
| ------- | ----- | ---------------- | ---------- |
| Phase 1 | 3-5j  | Architecte       | Dev Senior |
| Phase 2 | 5-7j  | Dev Senior       | Architecte |
| Phase 3 | 4-6j  | Dev Senior       | Dev Junior |
| Phase 4 | 2-3j  | Dev Full-stack   | UI/UX      |
| Phase 5 | 3-4j  | QA + Dev         | Tous       |

### Ressources Nécessaires

- **Architecte:** Design et validation patterns
- **Dev Senior:** Implémentation core migration
- **Dev Junior:** Tests et documentation
- **DevOps:** Monitoring et rollback procedures

### Jalons Critiques

- **J5:** Domain layer validé → GO/NO-GO Phase 2
- **J12:** Infrastructure migrée → GO/NO-GO Phase 3
- **J18:** Application layer complète → GO/NO-GO Phase 4
- **J23:** Tests consolidés → DÉPLOIEMENT

---

## ✅ CRITÈRES DE SUCCÈS

### Technique

- ✅ Build production 0 erreur
- ✅ Tests > 85% coverage domain/application
- ✅ Performance maintenue (< 5% régression)
- ✅ Architecture respecte Clean Architecture

### Métier

- ✅ Zero downtime pendant migration
- ✅ Fonctionnalités existantes préservées
- ✅ Équipe formée aux nouveaux patterns
- ✅ Documentation architecture complète

---

---

## 📋 HISTORIQUE DES MISES À JOUR

### Version 1.1 - Janvier 2025

- ✅ Scripts de migration corrigés et validés
- ✅ Agents wshobson configurés et opérationnels
- ✅ Dépendances manquantes ajoutées
- ✅ Validation robuste implémentée

### Version 1.0 - Janvier 2025

- 📋 Plan initial de migration Clean Architecture
- 🏗️ Structure cible définie
- ⏱️ Timeline et ressources planifiées

---

_Plan créé le: Janvier 2025_  
_Version: 1.1_  
_Statut: ✅ SCRIPTS PRÊTS - MIGRATION EXÉCUTABLE_
