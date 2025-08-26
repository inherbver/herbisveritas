# Guide des Tests - Herbis Veritas

## 📋 Vue d'ensemble

Ce guide documente les patterns et helpers établis pour les tests dans le projet Herbis Veritas.

## 🏗️ Infrastructure de test

### Helpers principaux

#### 1. `server-action-mocks.ts`
Helper centralisé pour tester les Server Actions Next.js.

```typescript
import { 
  createMockFormData, 
  testActionWithRedirect,
  setupServerActionMocks,
  createMockSupabaseAuth 
} from '@/test-utils/server-action-mocks';

// Setup dans chaque test
setupServerActionMocks();
```

#### 2. `supabase-mock-helper.ts`
Mocks chainables pour Supabase.

```typescript
import { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper';

const chain = createMockSupabaseChain({
  data: { id: 'test-id' },
  error: null,
});
```

## 🎯 Patterns de test

### Server Actions

```typescript
describe('Mon Action', () => {
  // Setup des mocks standards
  setupServerActionMocks();
  
  it('should handle success with redirect', async () => {
    const formData = createMockFormData({
      field: 'value'
    });
    
    // Gère automatiquement les redirections
    const result = await testActionWithRedirect(
      myAction, 
      undefined, 
      formData
    );
    
    expect(result?.success ?? true).toBe(true);
  });
});
```

### Services avec Supabase

```typescript
describe('Mon Service', () => {
  let mockSupabaseClient: any;
  
  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(() => createMockSupabaseChain({
        data: mockData,
        error: null
      }))
    };
    
    (createSupabaseServerClient as jest.Mock)
      .mockResolvedValue(mockSupabaseClient);
  });
});
```

## ✅ Best Practices

### 1. Gestion des retours `undefined`

Les Server Actions peuvent retourner `undefined` en cas de succès (redirection).

```typescript
// ✅ Correct
expect(result?.success ?? true).toBe(true);

// ❌ Éviter
expect(result.success).toBe(true);
```

### 2. FormData pour Server Actions

Toujours utiliser `createMockFormData` pour les tests d'actions serveur.

```typescript
// ✅ Correct
const formData = createMockFormData({
  email: 'test@example.com',
  password: 'password123'
});

// ❌ Éviter
const formData = new FormData();
formData.append('email', 'test@example.com');
```

### 3. Mocks Supabase chainables

Utiliser `createMockSupabaseChain` pour des mocks cohérents.

```typescript
// ✅ Correct
const chain = createMockSupabaseChain({
  data: mockData,
  error: null
});

// ❌ Éviter
const chain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn()
};
```

## 🔧 Migration des tests existants

Un script de migration automatique est disponible :

```bash
# Preview des changements
node scripts/migrate-tests-to-helpers.cjs --dry-run

# Appliquer la migration
node scripts/migrate-tests-to-helpers.cjs
```

## 📊 État actuel des tests

- **Tests totaux** : 434
- **Taux de réussite** : 71%
- **Tests passés** : 309
- **Tests échoués** : 125

## 🚀 Commandes utiles

```bash
# Lancer tous les tests
npm test

# Test spécifique
npm test -- --testPathPattern="authActions"

# Tests avec coverage
npm test -- --coverage

# Tests en mode watch
npm test -- --watch
```

## 📝 Checklist pour nouveaux tests

- [ ] Importer `setupServerActionMocks()` pour les Server Actions
- [ ] Utiliser `createMockFormData()` pour les formulaires
- [ ] Gérer les retours `undefined` avec `?.success ?? true`
- [ ] Utiliser `createMockSupabaseChain()` pour Supabase
- [ ] Mocker le rate limiter avec `withRateLimit`
- [ ] Tester les cas d'erreur et permissions

## 🔍 Debugging

Pour débugger les tests :

1. Ajouter `console.log` avec des préfixes clairs
2. Utiliser `--verbose` pour plus de détails
3. Isoler avec `it.only()` ou `describe.only()`
4. Vérifier les mocks avec `expect(mock).toHaveBeenCalled()`

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)