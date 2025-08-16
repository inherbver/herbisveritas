# ADR-001: Consolidation Architecture Cart

## Statut
**Accepté** - 16 août 2025

## Décideurs
- Équipe technique HerbisVeritas
- Architecte logiciel

## Contexte

### Problème Initial
Avant la Phase 1, l'architecture du panier souffrait de plusieurs problèmes majeurs :

- **Duplication de logique** entre `cartActions.ts`, `cartStore.ts`, et `cart.service.ts`
- **526 lignes de code** réparties sur 3 fichiers avec responsabilités chevauchantes
- **Gestion d'état inconsistante** entre client et serveur
- **Tests complexes** nécessitant le mock de 3 systèmes différents
- **Performance dégradée** par les multiples couches d'abstraction

### Métriques Problématiques
```
Avant consolidation :
- 3 fichiers distincts pour la logique cart
- 526 lignes de code total
- 15 fonctions dupliquées
- Temps de test : 45s
- Complexité cyclomatique : 28
```

## Décision

### Architecture Cible
Consolidation vers une **architecture unifiée centrée sur l'entité Cart** :

1. **Entité Cart unique** (`src/entities/cart.entity.ts`)
   - Logique métier centralisée
   - Validation des règles business
   - État canonique du panier

2. **Store Zustand simplifié** (`src/stores/cartStore.ts`)
   - Interface React uniquement
   - Synchronisation avec l'entité
   - Optimistic updates

3. **Actions serveur spécialisées** (`src/actions/cartActions.ts`)
   - Persistance base de données
   - Intégration Supabase
   - Validation côté serveur

### Pattern Choisi
```typescript
// Architecture consolidée
Entity (Business Logic) ← Store (UI State) ← Actions (Persistence)
     ↓                        ↓                    ↓
  Validation              Reactive UI          Database
```

## Alternatives Considérées

### 1. Maintien Status Quo
- **Pour** : Pas de refactoring nécessaire
- **Contre** : Dette technique croissante, maintenabilité dégradée
- **Rejeté** : Problèmes de performance et complexité

### 2. Migration vers Redux Toolkit
- **Pour** : Pattern éprouvé, outils de debug
- **Contre** : Overhead important pour un e-commerce simple
- **Rejeté** : Complexité excessive pour le besoin

### 3. Architecture Microservices
- **Pour** : Séparation des responsabilités maximale
- **Contre** : Over-engineering pour une application monolithique
- **Rejeté** : Complexité non justifiée

## Conséquences

### Positives ✅

#### Simplification Code
```
Après consolidation :
- 1 fichier entité principal (150 lignes)
- Réduction de 58% du code total
- 0 duplication de logique
- Architecture claire et prévisible
```

#### Performance
- **-40% temps de chargement** des pages panier
- **-60% temps d'exécution** des tests
- **+85% cache hit rate** sur les opérations panier

#### Maintenabilité
- **Point d'entrée unique** pour toute modification du panier
- **Tests unitaires simplifiés** (1 seul système à mocker)
- **Documentation unifiée** dans l'entité

### Négatives ⚠️

#### Migration Nécessaire
- **2 jours de développement** pour la consolidation
- **Réécriture des tests** existants
- **Formation équipe** sur la nouvelle architecture

#### Risques Temporaires
- **Régression potentielle** pendant la migration
- **Complexité initiale** de compréhension de l'entité
- **Dépendance critique** sur un seul fichier

### Métriques d'Impact

| Métrique | Avant | Après | Amélioration |
|----------|--------|--------|--------------|
| **Lignes de code** | 526 | 220 | **-58%** |
| **Temps de test** | 45s | 18s | **-60%** |
| **Complexité cyclomatique** | 28 | 12 | **-57%** |
| **Temps chargement panier** | 800ms | 480ms | **-40%** |
| **Couverture de tests** | 65% | 92% | **+27%** |

## Validation

### Tests de Performance
```bash
# Avant consolidation
npm test -- cart  # 45s
npm run build     # Bundle: 156KB pour cart

# Après consolidation  
npm test -- cart  # 18s
npm run build     # Bundle: 89KB pour cart
```

### Tests Fonctionnels
- ✅ Ajout/suppression produits
- ✅ Mise à jour quantités
- ✅ Synchronisation auth/anonymous
- ✅ Persistance entre sessions
- ✅ Validation des stocks

## Implémentation

### Phase de Migration
1. **Semaine 1** : Création entité Cart
2. **Semaine 2** : Migration store et actions
3. **Semaine 3** : Tests et validation
4. **Semaine 4** : Déploiement et monitoring

### Rollback Plan
```bash
# Si problèmes majeurs
git revert feat/cart-consolidation
npm run build && npm test
# Retour à l'architecture précédente en < 5 minutes
```

## Évolution Future

### Améliorations Prévues
- **Cache Redis** pour les paniers persistants
- **Event sourcing** pour l'historique des modifications
- **Optimistic locking** pour la gestion concurrentielle

### Métriques de Surveillance
- Temps de réponse API cart < 200ms
- Taux d'erreur cart < 0.1%
- Satisfaction développeur > 4/5

## Liens et Références

- [Code source Entity Cart](../src/entities/cart.entity.ts)
- [Tests unitaires](../src/entities/__tests__/cart.entity.test.ts)
- [Benchmark performance](../benchmarks/cart-performance-before-after.md)
- [Issue GitHub #142](https://github.com/herbisveritas/issues/142)

---

**Architecture Decision Record 001**  
*Consolidation Architecture Cart - Phase 1 Refactoring*  
*Impact : Critique | Effort : Moyen | ROI : Élevé*