# Guide de Référence Rapide - Clean Architecture

🎯 **Guide pratique pour les développeurs** utilisant l'architecture Clean nouvellement déployée.

## 🚀 Server Actions - Pattern Unifié

### ✅ Nouveau Pattern (à utiliser)

```typescript
export async function myServerAction(params: MyParams): Promise<ActionResult<MyResult>> {
  const context = LogUtils.createUserActionContext(userId, "my_operation", "my_domain");
  LogUtils.logOperationStart("my_operation", context);

  try {
    // 1. Validation
    if (!params.isValid) {
      throw new ValidationError("Message utilisateur", "field_name");
    }

    // 2. Permissions
    const hasPermission = await checkUserPermission("resource:action");
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    // 3. Logique métier
    const result = await businessLogic(params);

    // 4. Succès
    LogUtils.logOperationSuccess("my_operation", { ...context, resultData });
    return ActionResult.ok(result, "Opération réussie");
  } catch (error) {
    LogUtils.logOperationError("my_operation", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : "Erreur inattendue"
    );
  }
}
```

### ❌ Ancien Pattern (à éviter)

```typescript
// NE PLUS FAIRE ÇA
export async function oldServerAction(params) {
  try {
    const result = await doSomething(params);
    return { success: true, data: result };
  } catch (error) {
    console.error(error); // ❌ Pas de logging structuré
    return { success: false, error: error.message }; // ❌ Format inconsistant
  }
}
```

## 🎨 Utilisation côté Client

### React Components

```typescript
'use client';

import { myServerAction } from '@/actions/myActions';
import { useActionState } from 'react';

export function MyComponent() {
  const [state, formAction, isPending] = useActionState(myServerAction, null);

  return (
    <form action={formAction}>
      <input name="data" required />
      <button disabled={isPending}>
        {isPending ? 'En cours...' : 'Envoyer'}
      </button>

      {/* Gestion d'erreurs unifiée */}
      {state && !state.success && (
        <div className="error">{state.error}</div>
      )}

      {/* Message de succès */}
      {state?.success && (
        <div className="success">{state.message}</div>
      )}
    </form>
  );
}
```

### Utilisation Programmatique

```typescript
// Dans un event handler ou useEffect
const handleAction = async () => {
  const result = await myServerAction(params);

  if (result.success) {
    // Traiter le succès
    console.log("Succès:", result.data);
    toast.success(result.message);
  } else {
    // Traiter l'erreur
    console.error("Erreur:", result.error);
    toast.error(result.error);
  }
};
```

## 🔧 Services Métier

### Utilisation des Services Existants

```typescript
// Services disponibles
import { ProductValidationService } from "@/lib/domain/services/product-validation.service";
import { AddressValidationService } from "@/lib/domain/services/address-validation.service";
import { CheckoutOrchestrator } from "@/lib/domain/services/checkout.service";

// Utilisation dans un Server Action
export async function myComplexAction(params): Promise<ActionResult<T>> {
  const validationService = new ProductValidationService();
  const validationResult = await validationService.validateCartProducts(items);

  if (!validationResult.success) {
    return validationResult; // Propagation directe de l'erreur
  }

  // Continuer avec les données validées
  const validatedData = validationResult.data;
  // ...
}
```

### Créer un Nouveau Service

```typescript
// src/lib/domain/services/mon-service.service.ts
export class MonDomainService {
  constructor(private logger = LogUtils) {}

  async executeBusinessLogic(params: Params): Promise<ActionResult<Result>> {
    const context = this.logger.createUserActionContext(
      "unknown",
      "business_operation",
      "mon_domain"
    );

    try {
      // Logique métier complexe
      const result = await this.processComplexLogic(params);

      this.logger.logOperationSuccess("business_operation", context);
      return ActionResult.ok(result);
    } catch (error) {
      this.logger.logOperationError("business_operation", error, context);
      throw error; // Re-throw pour gestion par le Server Action
    }
  }
}
```

## 🚨 Gestion d'Erreurs

### Types d'Erreurs Disponibles

```typescript
import {
  ValidationError, // Erreurs de validation (400)
  AuthenticationError, // Erreurs d'auth (401/403)
  BusinessError, // Erreurs métier (422)
  CheckoutBusinessError, // Erreurs spécifiques checkout
} from "@/lib/core/errors";

// Utilisation
throw new ValidationError("Email invalide", "email");
throw new AuthenticationError("Token expiré");
throw new BusinessError("Stock insuffisant");
throw new CheckoutBusinessError(CheckoutErrorCode.INSUFFICIENT_STOCK, "Plus de stock disponible");
```

### Gestion d'Erreurs Supabase

```typescript
import { ErrorUtils } from "@/lib/core/errors";

try {
  const { data, error } = await supabase.from("table").select();
  if (error) {
    throw ErrorUtils.fromSupabaseError(error); // Conversion automatique
  }
} catch (error) {
  // L'erreur est maintenant typée et user-friendly
}
```

## 📊 Logging

### Logging Structuré

```typescript
import { LogUtils } from "@/lib/core/logger";

// Création du contexte
const context = LogUtils.createUserActionContext(
  userId, // ID utilisateur (ou 'unknown'/'guest')
  "operation_name", // Nom de l'opération
  "domain_name", // Domaine métier
  { extra: "data" } // Données contextuelles optionnelles
);

// Log de démarrage
LogUtils.logOperationStart("operation_name", context);

// Log de succès avec métriques
LogUtils.logOperationSuccess("operation_name", {
  ...context,
  duration: 150,
  recordsProcessed: 5,
});

// Log d'erreur
LogUtils.logOperationError("operation_name", error, context);
```

## 🔒 Permissions

### Vérification des Permissions

```typescript
import { checkUserPermission } from "@/lib/auth/server-auth";
import { withPermissionSafe } from "@/lib/auth/server-actions-auth";

// Méthode 1: Vérification manuelle
const hasPermission = await checkUserPermission("products:create");
if (!hasPermission) {
  throw new AuthenticationError("Permission refusée");
}

// Méthode 2: Wrapper automatique (recommandé)
export const createProduct = withPermissionSafe(
  "products:create",
  async (data: ProductFormValues): Promise<ActionResult<unknown>> => {
    // La vérification est automatique
    // Code métier ici
  }
);
```

### Permissions Disponibles

```typescript
// Permissions système
("products:create", "products:read", "products:update", "products:delete");
("content:create", "content:update", "content:delete");
("users:read:all", "users:update:role");
("admin:access");

// Vérifier la liste complète dans src/lib/auth/permissions.ts
```

## 📦 Store Zustand (Client State)

### Stores Disponibles

```typescript
// Cart Store (refactorisé)
import { useCartItems, useCartLoading, useCartErrors } from "@/stores/cart-store-refactored";

// Utilisation
const items = useCartItems();
const loading = useCartLoading();
const errors = useCartErrors();

// Opérations via le système de sync
import { useCartOperations } from "@/lib/store-sync/cart-sync";
const { addItem, removeItem, updateQuantity } = useCartOperations();
```

## 🧪 Tests

### Test d'un Server Action

```typescript
// src/actions/__tests__/myAction.test.ts
import { myServerAction } from "../myActions";

describe("myServerAction", () => {
  it("should return success with valid data", async () => {
    const result = await myServerAction(validParams);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.message).toBe("Opération réussie");
  });

  it("should return error with invalid data", async () => {
    const result = await myServerAction(invalidParams);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### Mock des Services

```typescript
// Mock d'un service pour les tests
jest.mock("@/lib/domain/services/mon-service.service", () => ({
  MonDomainService: jest.fn().mockImplementation(() => ({
    executeBusinessLogic: jest.fn().mockResolvedValue(ActionResult.ok(mockData)),
  })),
}));
```

## 🔍 Debugging

### Logs à Surveiller

```bash
# Logs structurés dans la console
[INFO] Operation started: add_to_cart | userId: user-123 | domain: cart
[SUCCESS] Operation completed: add_to_cart | duration: 150ms | items: 1
[ERROR] Operation failed: add_to_cart | error: Insufficient stock
```

### Variables d'Environnement de Debug

```bash
# .env.local
DEBUG_LOGGING=true          # Logs détaillés
DEBUG_ACTIONS=true          # Debug Server Actions
DEBUG_VALIDATION=true       # Debug validation
```

## 📚 Fichiers de Référence

### Core Architecture

```
src/lib/core/
├── result.ts        # ActionResult<T> + Result<T,E>
├── errors.ts        # Hiérarchie d'erreurs typées
└── logger.ts        # Système de logging structuré
```

### Services Métier

```
src/lib/domain/services/
├── checkout.service.ts           # CheckoutOrchestrator
├── product-validation.service.ts # ProductValidationService
└── address-validation.service.ts # AddressValidationService
```

### Server Actions Harmonisés

```
src/actions/
├── cartActions.ts        # ✅ ActionResult<T>
├── productActions.ts     # ✅ ActionResult<T>
├── authActions.ts        # ✅ ActionResult<T>
├── magazineActions.ts    # ✅ ActionResult<T>
├── userActions.ts        # ✅ ActionResult<T>
├── adminActions.ts       # ✅ ActionResult<T>
├── addressActions.ts     # ✅ ActionResult<T>
└── stripeActions.ts      # ✅ ActionResult<T>
```

## ⚡ Bonnes Pratiques

### ✅ À Faire

- Toujours utiliser `ActionResult<T>` pour les Server Actions
- Logger le début, succès et erreurs des opérations
- Utiliser des erreurs typées (`ValidationError`, `BusinessError`, etc.)
- Valider les permissions en début d'action
- Structurer le code : validation → permissions → logique → logging

### ❌ À Éviter

- Formats de retour custom `{success, data, error}`
- `console.log` pour le logging (utiliser `LogUtils`)
- Gestion d'erreurs avec `try/catch` sans re-throw approprié
- Actions sans vérification de permissions
- Logique métier complexe dans les Server Actions (utiliser des services)

---

**Cette architecture Clean offre une base solide, maintenable et évolutive pour votre application e-commerce ! 🚀**

Pour plus de détails, consultez la [documentation complète](./ARCHITECTURE.md).
