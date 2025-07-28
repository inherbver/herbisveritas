# Guide d'Harmonisation Server Actions

Ce guide montre comment migrer les Server Actions vers l'architecture Clean avec le pattern `ActionResult<T>`.

## 🔄 Pattern de Migration Standard

### Avant (Pattern inconsistant)
```typescript
export async function someAction(data: FormData) {
  const supabase = await createSupabaseServerClient();
  
  // Validation basique
  if (!data.get('field')) {
    return {
      success: false,
      message: "Champ requis",
      errors: { field: ["Erreur"] }
    };
  }
  
  // Opération DB
  const { data: result, error } = await supabase.from('table').insert(data);
  
  if (error) {
    console.error('Error:', error);
    return {
      success: false,
      message: error.message
    };
  }
  
  return {
    success: true,
    message: "Succès !",
    data: result
  };
}
```

### Après (Pattern harmonisé)
```typescript
export async function someAction(data: FormData): Promise<ActionResult<SomeType>> {
  const context = LogUtils.createUserActionContext('unknown', 'some_action', 'domain');
  LogUtils.logOperationStart('some_action', context);

  try {
    const supabase = await createSupabaseServerClient();
    
    // Validation avec Zod + Classes d'erreur
    const validationResult = SomeSchema.safeParse({
      field: data.get('field')
    });
    
    if (!validationResult.success) {
      throw new ValidationError(
        'Données invalides',
        undefined,
        { validationErrors: validationResult.error.flatten().fieldErrors }
      );
    }
    
    // Opération DB avec gestion d'erreur unifiée
    const { data: result, error } = await supabase
      .from('table')
      .insert(validationResult.data);
    
    if (error) {
      throw ErrorUtils.fromSupabaseError(error);
    }
    
    LogUtils.logOperationSuccess('some_action', context);
    return ActionResult.ok(result, 'Opération réussie !');
  } catch (error) {
    LogUtils.logOperationError('some_action', error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Une erreur inattendue est survenue'
    );
  }
}
```

## 📋 Checklist de Migration

### ✅ Imports requis
```typescript
// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { logger, LogUtils } from "@/lib/core/logger";
import { 
  ValidationError, 
  BusinessError,
  AuthenticationError,
  ErrorUtils 
} from "@/lib/core/errors";
```

### ✅ Structure de fonction
1. **Signature**: Ajouter `: Promise<ActionResult<T>>`
2. **Context**: Créer context avec `LogUtils.createUserActionContext()`
3. **Logging start**: `LogUtils.logOperationStart()`
4. **Try/catch**: Enrober toute la logique
5. **Validation**: Utiliser classes d'erreur `ValidationError`
6. **DB operations**: Utiliser `ErrorUtils.fromSupabaseError()`
7. **Success**: `ActionResult.ok()` avec logging
8. **Error**: `ActionResult.error()` avec logging

### ✅ Gestion d'erreurs unifiée
```typescript
// Remplacer les console.error par ErrorUtils
if (error) {
  throw ErrorUtils.fromSupabaseError(error);
}

// Remplacer les returns d'erreur par des throws
throw new ValidationError('Message', 'field');
throw new BusinessError('Règle métier violée');
throw new AuthenticationError('Non authentifié');
```

### ✅ Logging unifié
```typescript
// Début d'opération
LogUtils.logOperationStart('operation_name', context);

// Succès
LogUtils.logOperationSuccess('operation_name', { ...context, additionalData });

// Erreur
LogUtils.logOperationError('operation_name', error, context);
```

## 🎯 Features à Migrer

### Priorité Haute
- [x] **Products** - ✅ Terminé (productActions.ts)
- [ ] **Auth** - En cours (authActions.ts)
- [ ] **Orders** - Prochaine (ordersActions.ts)

### Priorité Moyenne  
- [ ] **Magazine** - (magazineActions.ts)
- [ ] **Users** - (userActions.ts)
- [ ] **Addresses** - (addressActions.ts)

### Priorité Basse
- [ ] **Admin** - (adminActions.ts)
- [ ] **Stripe** - (stripeActions.ts)

## 🧪 Testing

Après chaque migration :
1. `npm run lint` - Vérifier ESLint
2. `npm run build` - Vérifier TypeScript
3. `npm run test` - Lancer les tests
4. Test manuel des fonctionnalités

## 📊 Bénéfices attendus

- **Consistency**: Pattern uniforme sur toutes les features
- **Type Safety**: TypeScript strict avec `ActionResult<T>`
- **Error Handling**: Gestion robuste avec classes d'erreur
- **Observability**: Logging uniforme avec LogUtils
- **Maintainability**: Code plus lisible et debuggable