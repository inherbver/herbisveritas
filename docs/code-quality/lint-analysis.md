# Analyse des Erreurs ESLint du Projet

## 📊 Classification par Type et Priorité

### 🔴 **Critique - À corriger immédiatement (135 erreurs)**

#### 1. **Types non spécifiés** (133 erreurs) - Priorité TRÈS HAUTE

- **`Unexpected any`** : 133 occurrences
- **Impact** : Perte de la sécurité TypeScript, bugs potentiels
- **Localisation** : Infrastructure, événements, repositories
- **Action** : Remplacer par des types spécifiques

### 🟠 **Important - À planifier (20 erreurs)**

#### 2. **Imports interdits** (16 erreurs) - Priorité HAUTE

- **`A 'require()' style import is forbidden`** : 16 occurrences
- **Impact** : Incompatibilité ES modules, performance
- **Localisation** : Tests principalement
- **Action** : Convertir en imports ES6

#### 3. **Variables non utilisées** (4 erreurs) - Priorité MOYENNE

- **`'logger' is defined but never used`** : 12 occurrences
- **`'error' is defined but never used`** : 4 occurrences
- **`'userId' is assigned a value but never used`** : 3 occurrences
- **Impact** : Code mort, confusion
- **Action** : Supprimer ou préfixer avec `_`

### 🟡 **Mineur - Maintenance (30+ erreurs)**

#### 4. **Code mort** (20+ erreurs) - Priorité BASSE

- Types/interfaces non utilisés : `ServiceLifetime`, `DomainEvent`, `CartItem`, etc.
- Variables assignées non utilisées : `total`, `routeKey`, `container`, etc.
- **Action** : Nettoyage progressif

#### 5. **Qualité du code** (5 erreurs) - Priorité BASSE

- **Regex mal échappées** : 3 occurrences (`\+`, `\(`, `\)`)
- **Hooks React** : 1 dépendance manquante
- **Async/await** : 1 mauvaise pratique
- **Action** : Corrections ponctuelles

## 🎯 Plan d'Action Recommandé

### Phase 1 - Critique (Semaine 1)

```bash
# 1. Identifier tous les 'any' types
grep -r "any" src/ --include="*.ts" --include="*.tsx"

# 2. Prioriser par fichier
# - lib/core/* (système critique)
# - lib/infrastructure/* (base de données)
# - components/* (interface utilisateur)
```

### Phase 2 - Important (Semaine 2-3)

```bash
# 1. Convertir les require() en imports
find src/ -name "*.test.ts" -exec grep -l "require(" {} \;

# 2. Nettoyer les variables non utilisées
# Utiliser l'auto-fix d'ESLint quand possible
```

### Phase 3 - Maintenance (Planification mensuelle)

- Nettoyage progressif du code mort
- Correction des petites erreurs de qualité

## 📁 Répartition par Répertoire

### **Infrastructure** (≈60% des erreurs)

- `lib/infrastructure/events/` - Beaucoup de `any` types
- `lib/infrastructure/container/` - Types génériques mal définis
- `lib/infrastructure/repositories/` - Requêtes Supabase non typées

### **Core System** (≈20% des erreurs)

- `lib/core/` - Types de base à affiner
- `actions/` - Quelques imports et variables non utilisées

### **Tests** (≈15% des erreurs)

- `__tests__/` - Principalement des imports `require()`
- Mocks non typés

### **Components** (≈5% des erreurs)

- Mostly clean après notre refactorisation

## 🏆 Zones Propres (Post-Refactorisation)

### ✅ **Authentication System**

- `src/hooks/useAuthForm.ts` - Clean
- `src/lib/auth/error-handler.ts` - Clean
- `src/components/domain/auth/` - Clean
- `src/actions/authActions.ts` - Clean

## 🚨 Zones Critiques à Prioriser

### 1. **Event System** (35+ erreurs)

```typescript
// Exemple de problème typique
handler: (event: any) => Promise<any>;
// Devrait être :
handler: (event: DomainEvent<T>) => Promise<EventProcessingResult>;
```

### 2. **Repository Layer** (25+ erreurs)

```typescript
// Problème typique
data: any;
// Devrait être :
data: SupabaseTableRow<T>;
```

### 3. **Container/DI System** (20+ erreurs)

```typescript
// Problème typique
resolve<T>(): any
// Devrait être :
resolve<T>(): T
```

## 💡 Recommandations

1. **Créer des types stricts** pour remplacer les `any`
2. **Utiliser des utilitaires TypeScript** comme `Pick`, `Omit`, `Partial`
3. **Configurer ESLint plus strictement** pour éviter les régressions
4. **Mise en place de pre-commit hooks** fonctionnels
5. **Formation équipe** sur les bonnes pratiques TypeScript

---

_Analyse générée le 2025-01-04 - Total: ~200 warnings ESLint_
