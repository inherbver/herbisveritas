# Documentation Complète du Système d'Administration

**Version :** 3.0 (Consolidée - Juillet 2025)  
**Dernière mise à jour :** 2025-07-21

Cette documentation consolide et remplace les anciens documents d'administration dispersés. Elle décrit le système d'administration opérationnel de HerbisVeritas dans son état actuel.

---

## 📋 Vue d'Ensemble

Le système d'administration de HerbisVeritas est un système RBAC (Role-Based Access Control) moderne avec les caractéristiques suivantes :

### ✅ **Fonctionnalités Opérationnelles**

- **Gestion des utilisateurs** : Attribution des rôles avec audit complet
- **Gestion des produits** : CRUD complet avec traductions multilingues
- **Gestion des commandes** : Interface de visualisation et suivi (en développement)
- **Surveillance sécurisée** : Détection automatique des admins non autorisés
- **Audit complet** : Journalisation immutable de toutes les actions admin

### 🏗️ **Architecture Technique**

- **Framework** : Next.js 15 avec App Router et Server Components
- **Authentification** : Supabase Auth avec RLS (Row Level Security)
- **Base de données** : PostgreSQL avec politiques RLS granulaires
- **Cache** : Système de cache en mémoire pour les permissions (TTL: 5 minutes)
- **Monitoring** : Système d'événements et d'alertes en temps réel
- **UI** : shadcn/ui components avec Tailwind CSS
- **Internationalisation** : next-intl (français par défaut)

---

## 🔐 Système de Rôles et Permissions

### Types de Rôles

```typescript
type UserRole = "user" | "editor" | "admin" | "dev";
```

### Hiérarchie des Permissions

#### **👤 Utilisateur (`user`)**

- `orders:read:own` - Voir ses propres commandes
- `profile:read:own` - Voir son propre profil
- `profile:update:own` - Modifier son propre profil
- `content:read` - Lire le contenu public

#### **✏️ Éditeur (`editor`)**

Inclut toutes les permissions utilisateur PLUS :

- `admin:access` - Accès au dashboard admin
- `products:read|create|update` - Gestion des produits
- `content:create|update|delete` - Gestion du contenu

#### **🛠️ Administrateur (`admin`)**

Inclut toutes les permissions éditeur PLUS :

- `admin:read|write` - Accès complet admin
- `users:read:all|update:role|manage` - Gestion des utilisateurs
- `products:delete` - Suppression de produits
- `settings:view|update` - Configuration système
- `orders:read:all|update:status` - Gestion des commandes

#### **🔧 Développeur (`dev`)**

Accès complet : permission wildcard `*`

---

## 🏛️ Architecture du Système

### Structure des Fichiers Admin

```
src/
├── app/[locale]/admin/           # Pages d'administration
│   ├── layout.tsx               # Layout sécurisé avec vérification admin
│   ├── page.tsx                 # Dashboard principal avec ActivityLog
│   ├── products/                # Gestion des produits
│   │   ├── page.tsx            # Liste des produits avec DataTable
│   │   ├── columns.tsx         # Définition colonnes avec actions
│   │   ├── data-table.tsx      # Table avec tri/pagination/filtres
│   │   ├── actions.ts          # Server Actions produits
│   │   ├── new/page.tsx        # Création de produit
│   │   ├── [id]/edit/page.tsx  # Édition de produit
│   │   └── ...
│   ├── users/                   # Gestion des utilisateurs
│   │   ├── page.tsx            # Liste utilisateurs avec rôles
│   │   ├── columns.tsx         # Colonnes avec actions de rôle
│   │   ├── data-table.tsx      # Interface de gestion
│   │   └── update-role-dialog.tsx
│   ├── orders/                  # Gestion des commandes (en développement)
│   └── security-test/           # Page de diagnostic sécurité
├── components/admin/            # Composants admin réutilisables
│   ├── AdminStatus.tsx         # Surveillance sécurité temps réel
│   ├── admin-sidebar.tsx       # Navigation desktop
│   ├── mobile-sidebar.tsx      # Navigation mobile
│   ├── dashboard-shell.tsx     # Layout wrapper
│   ├── ActivityLog.tsx         # Affichage des événements
│   ├── EventLogFilters.tsx     # Filtres avancés pour logs
│   ├── ProductFilters.tsx      # Filtres produits avancés
│   ├── role-manager.tsx        # Interface changement de rôle
│   └── image-upload-field.tsx  # Upload d'images produits
├── actions/
│   ├── adminActions.ts         # Actions admin sécurisées
│   ├── userActions.ts          # Actions utilisateurs
│   └── productActions.ts       # Actions produits
├── lib/auth/
│   ├── admin-service.ts        # Service admin principal
│   ├── server-auth.ts          # Authentification serveur
│   └── types.ts                # Types et permissions RBAC
├── lib/admin/
│   ├── dashboard.ts            # Services dashboard
│   ├── event-logger.ts         # Système de logging
│   └── monitoring-service.ts   # Surveillance sécurité
└── middleware.ts               # Protection routes /admin
```

---

## 🔒 Sécurité Multi-Couches

### 1. **Protection Middleware** (`src/middleware.ts`)

```typescript
// Vérification automatique pour toutes les routes /admin/*
if (pathToCheck.startsWith("/admin")) {
  const { isAuthorized } = await checkUserPermission("admin:access");
  if (!isAuthorized) {
    // Redirection + logging sécurité
    await logSecurityEvent({
      type: "UNAUTHORIZED_ADMIN_ACCESS",
      severity: "WARNING",
      data: { path, ip, userAgent },
    });
  }
}
```

### 2. **Layout Admin Sécurisé** (`src/app/[locale]/admin/layout.tsx`)

```typescript
const { isAuthorized, error } = await checkUserPermission("admin:access");
if (!isAuthorized) {
  return <UnauthorizedAlert error={error} />;
}
```

### 3. **Row Level Security (RLS)**

Politiques PostgreSQL sur toutes les tables sensibles :

```sql
-- Seuls les admins peuvent voir tous les profils
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT
USING (is_admin());

-- Utilisateurs voient leur propre profil
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT
USING (auth.uid() = id);
```

### 4. **Server Actions Sécurisées**

Toutes les actions admin utilisent `withPermissionSafe()` :

```typescript
export async function deleteProduct(productId: string) {
  return withPermissionSafe("products:delete", async (user) => {
    // Logique sécurisée
    await logSecurityEvent({
      type: "PRODUCT_DELETED",
      userId: user.id,
      data: { productId },
    });
  });
}
```

---

## 📊 Base de Données

### Tables Principales

#### **`profiles`** - Profils utilisateurs avec rôles

```sql
- id (uuid, FK vers auth.users.id)
- role (app_role: user|editor|admin|dev)
- permissions (text[], permissions custom)
- first_name, last_name, email
- addresses (billing/shipping)
- created_at, updated_at
```

#### **`audit_logs`** - Journal d'audit immutable

```sql
- id (uuid)
- event_type (text)
- user_id (uuid, FK vers auth.users.id)
- data (jsonb, métadonnées flexibles)
- severity (event_severity: INFO|WARNING|ERROR|CRITICAL)
- created_at (timestamptz)
```

#### **`products`** - Produits avec statut admin

```sql
- id (uuid)
- name, description_short, description_long
- price (numeric), currency (défaut: EUR)
- stock (integer), category, unit
- image_url, slug (unique)
- labels (text[]), inci_list (text[])
- is_active, is_new, is_on_promotion
- status (draft|inactive|active)
- created_at, updated_at
```

#### **`product_translations`** - Traductions multilingues

```sql
- id (uuid)
- product_id (uuid, FK vers products.id)
- locale (text: fr|en|de|es)
- name, short_description, description_long
- usage_instructions, properties, composition_text
- created_at, updated_at
```

#### **`orders`** - Commandes avec statuts admin

```sql
- id (uuid)
- user_id (uuid, FK vers auth.users.id)
- order_number (text, unique)
- status (order_status_type)
- total_amount (numeric), currency
- payment_status (payment_status_type)
- shipping_address_id, billing_address_id
- stripe_checkout_session_id
- created_at, updated_at
```

### Fonctions Helper RLS

```sql
-- Vérification admin simple
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérification permission spécifique
CREATE OR REPLACE FUNCTION has_permission(required_permission text)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions text[];
  user_role app_role;
BEGIN
  SELECT role, permissions INTO user_role, user_permissions
  FROM profiles WHERE id = auth.uid();

  -- Admin complet
  IF user_role = 'admin' OR '*' = ANY(user_permissions) THEN
    RETURN TRUE;
  END IF;

  -- Permission spécifique
  RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🖥️ Interface d'Administration

### Dashboard Principal (`/admin`)

**Composants affichés :**

- `AdminStatus` : Surveillance sécurité temps réel
- `ActivityLog` : Journal des événements récents avec filtres
- Métriques KPI (commentées, prêtes pour implémentation)

**Fonctionnalités :**

- ✅ Détection automatique admins non autorisés
- ✅ Refresh manuel du statut sécurité
- ✅ Filtrage événements par type/sévérité/date
- ✅ Navigation responsive desktop/mobile

### Gestion des Produits (`/admin/products`)

**Fonctionnalités complètes :**

- ✅ **Liste** avec DataTable (tri, pagination, recherche)
- ✅ **Filtres avancés** : statut, stock, nouvelles promotions
- ✅ **Création** avec formulaire multilingue
- ✅ **Édition** des produits existants
- ✅ **Désactivation** soft-delete (statut `inactive`)
- ✅ **Upload d'images** avec prévisualisation
- ✅ **Gestion des traductions** (fr, en, de, es)

**Interface :**

```typescript
// Colonnes DataTable avec actions
const columns: ColumnDef<ProductWithTranslations>[] = [
  { accessorKey: "name", header: "Nom" },
  { accessorKey: "price", header: "Prix" },
  { accessorKey: "stock", header: "Stock" },
  { accessorKey: "status", header: "Statut" },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${row.original.id}/edit`}>
              Éditer
            </Link>
          </DropdownMenuItem>
          <DeactivateProductDialog product={row.original} />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

### Gestion des Utilisateurs (`/admin/users`)

**Fonctionnalités :**

- ✅ **Liste complète** des utilisateurs avec rôles
- ✅ **Modification des rôles** avec justification obligatoire
- ✅ **Audit trail** complet des changements
- ✅ **Protection** : impossible de supprimer le dernier admin

**Interface de changement de rôle :**

```typescript
<UpdateRoleDialog
  user={user}
  currentRole={user.role}
  onRoleUpdate={handleRoleUpdate}
  requiresJustification={true}
/>
```

### Gestion des Commandes (`/admin/orders`)

⚠️ **En développement** - Structure préparée mais non implémentée

---

## ⚡ Services et API

### Service Admin Principal (`src/lib/auth/admin-service.ts`)

**Fonctions principales :**

```typescript
// Vérification admin avec cache
const { isAdmin, role, permissions } = await checkAdminRole(userId);

// Vérification permission spécifique
const canManage = await hasPermission(userId, "users:manage");

// Service de gestion des rôles (admin uniquement)
const roleService = await createUserRoleService(adminUserId);
await roleService.assignRole(targetUserId, "editor");

// Logging sécurité automatique
await logSecurityEvent({
  type: "ROLE_CHANGE",
  userId: adminId,
  severity: "INFO",
  data: { target: targetUserId, newRole: "editor" },
});
```

### Cache Performant

- **Mécanisme** : Map JavaScript en mémoire
- **TTL** : 5 minutes (300 secondes) par défaut
- **Invalidation** : Automatique lors changements de rôle
- **Nettoyage** : Suppression périodique des entrées expirées

```typescript
// Structure cache
interface CachedRoleData {
  role: UserRole;
  permissions: string[];
  timestamp: number;
  ttl: number; // Time To Live en ms
}
```

### Server Actions Sécurisées

**Pattern de sécurisation :**

```typescript
// Wrapper de sécurité
export async function withPermissionSafe<T>(
  permission: string,
  action: (user: User) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const { isAuthorized, user } = await checkUserPermission(permission);

    if (!isAuthorized) {
      await logSecurityEvent({
        type: "UNAUTHORIZED_ACTION_ATTEMPT",
        severity: "WARNING",
        data: { permission, action: action.name },
      });
      return { success: false, error: "Permission refusée" };
    }

    const result = await action(user);
    return { success: true, data: result };
  } catch (error) {
    await logSecurityEvent({
      type: "ACTION_ERROR",
      severity: "ERROR",
      data: { permission, error: error.message },
    });
    return { success: false, error: error.message };
  }
}
```

---

## 📈 Surveillance et Monitoring

### Détection Automatique d'Admins Non Autorisés

**Service de monitoring** (`src/lib/admin/monitoring-service.ts`) :

```typescript
// Détection périodique
export async function checkForUnauthorizedAdmins(): Promise<UnauthorizedAdmin[]> {
  const allAdmins = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, created_at")
    .eq("role", "admin");

  return allAdmins.filter((admin) => !authorizedAdminIds.includes(admin.id));
}
```

### Système d'Événements

**Types d'événements tracés :**

- `ADMIN_LOGIN` / `ADMIN_LOGOUT`
- `UNAUTHORIZED_ADMIN_ACCESS`
- `ROLE_CHANGE`
- `PRODUCT_CREATED` / `PRODUCT_UPDATED` / `PRODUCT_DELETED`
- `USER_PROFILE_UPDATED`
- `SYSTEM_ERROR`

**Interface de logging :**

```typescript
await logSecurityEvent({
  type: "PRODUCT_CREATED",
  userId: adminId,
  severity: "INFO",
  data: {
    productId: newProduct.id,
    name: newProduct.name,
    price: newProduct.price,
    ip: request.ip,
    userAgent: request.headers["user-agent"],
  },
});
```

### Dashboard de Monitoring

**Composant AdminStatus** - Surveillance temps réel :

```typescript
// Indicateurs visuels
<div className="flex items-center gap-2">
  <div className={`h-2 w-2 rounded-full ${statusColor}`} />
  <span className="text-sm font-medium">
    {unauthorizedAdmins.length === 0
      ? "Système sécurisé"
      : `${unauthorizedAdmins.length} admin(s) non autorisé(s)`
    }
  </span>
</div>

// Actions disponibles
<Button
  onClick={() => checkAdminStatus()}
  disabled={isChecking}
  variant="outline"
  size="sm"
>
  {isChecking ? "Vérification..." : "Actualiser"}
</Button>
```

---

## 🚀 Guide d'Utilisation

### Pour les Développeurs

#### 1. Protéger une Page Admin

```typescript
// src/app/[locale]/admin/nouvelle-page/page.tsx
import { checkUserPermission } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { isAuthorized } = await checkUserPermission("admin:access");

  if (!isAuthorized) {
    redirect("/unauthorized");
  }

  return (
    <div>
      {/* Contenu admin sécurisé */}
    </div>
  );
}
```

#### 2. Créer une Server Action Sécurisée

```typescript
// src/actions/nouvelleAction.ts
"use server";

import { withPermissionSafe } from "@/lib/auth/server-auth";

export async function maFonctionAdmin(data: FormData) {
  return withPermissionSafe("specific:permission", async (user) => {
    // Logique métier sécurisée
    const result = await businessLogic(data);

    await logSecurityEvent({
      type: "CUSTOM_ACTION",
      userId: user.id,
      data: { action: "maFonctionAdmin", result },
    });

    return result;
  });
}
```

#### 3. Vérifier une Permission Client-Side

```typescript
// Dans un composant client
'use client';

import { useUser } from "@/hooks/use-user";
import { hasPermissionClient } from "@/lib/auth/client-permissions";

export default function MonComposant() {
  const { user } = useUser();
  const canDelete = hasPermissionClient(user, "products:delete");

  return (
    <div>
      {canDelete && (
        <Button variant="destructive">Supprimer</Button>
      )}
    </div>
  );
}
```

### Pour les Administrateurs

#### 1. Vérification de Sécurité

```bash
# Audit automatisé des rôles
npm run audit-roles

# Page de diagnostic complète
# Naviguer vers /admin/security-test
```

#### 2. Surveillance des Événements

- **Dashboard principal** : `/admin` - ActivityLog en temps réel
- **Filtrage avancé** : Par type, sévérité, utilisateur, date
- **Export** : Possible via requêtes SQL directes

#### 3. Gestion des Utilisateurs

- **Promotion/Rétrogradation** : Via interface `/admin/users`
- **Justification obligatoire** : Pour tous les changements de rôle
- **Protection** : Impossible de supprimer le dernier admin

---

## 🔧 Configuration et Déploiement

### Variables d'Environnement

```bash
# .env.local - Configuration admin
ADMIN_PRINCIPAL_ID=uuid-de-l-admin-principal
ADMIN_EMAIL=admin@mondomaine.com

# Supabase (requis pour RLS et auth)
NEXT_PUBLIC_SUPABASE_URL=votre-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anonyme
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Edge Functions (pour gestion des rôles)
NEXT_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL=votre-url-edge-functions
```

### Migrations Critiques

**Migration de base** (`20250119120000_add_role_based_admin_system.sql`) :

- Ajoute colonnes `role` et `permissions` à `profiles`
- Crée les fonctions helper RLS
- Met en place les politiques de sécurité
- Initialise l'admin principal

**Migration audit** (`20250704101800_create_audit_logs_table.sql`) :

- Table `audit_logs` immutable
- Enum `event_severity`
- Politiques RLS pour protection des logs

### Edge Functions

**Déploiement** :

```bash
# Déployer les fonctions Edge
supabase functions deploy set-user-role

# Tester localement
supabase functions serve --env-file .env.local
```

### Vérifications Post-Déploiement

1. ✅ **Admin principal** configuré avec `ADMIN_PRINCIPAL_ID`
2. ✅ **Politiques RLS** actives sur toutes les tables sensibles
3. ✅ **Edge Functions** déployées et accessibles
4. ✅ **Cache système** fonctionnel (TTL 5 minutes)
5. ✅ **Audit logging** opérationnel dans `audit_logs`

---

## 🧪 Tests et Validation

### Page de Diagnostic (`/admin/security-test`)

Tests automatiques disponibles :

- ✅ Configuration variables d'environnement
- ✅ Connexion base de données et Supabase
- ✅ Fonctions RLS et permissions
- ✅ Système de cache et TTL
- ✅ Logging de sécurité et audit_logs
- ✅ Edge Functions et gestion des rôles

### Tests Unitaires

Emplacements des tests :

- `src/lib/auth/__tests__/admin-service.test.ts`
- `src/lib/auth/__tests__/types.test.ts`
- `src/lib/admin/__tests__/monitoring-service.test.ts`

### Validation Manuelle

```bash
# Vérifier l'audit des rôles
npm run audit-roles

# Tester les permissions (console navigateur)
await checkUserPermission("admin:access");

# Vérifier les logs d'audit (SQL)
SELECT * FROM audit_logs WHERE event_type = 'ROLE_CHANGE' ORDER BY created_at DESC;
```

---

## 🚨 Procédures d'Urgence

### Compromission Suspectée

1. **IMMÉDIAT** : Exécuter `npm run audit-roles`
2. **ANALYSER** : Consulter `/admin/security-test` et `audit_logs`
3. **RÉVOQUER** : Changer le rôle via Supabase Dashboard ou SQL :
   ```sql
   UPDATE profiles SET role = 'user' WHERE id = 'uuid-utilisateur-suspect';
   ```
4. **NOTIFIER** : Documenter dans `audit_logs` et alerter l'équipe

### Admin Principal Compromis

1. **URGENCE** : Utiliser `ADMIN_PRINCIPAL_ID` en fallback
2. **ACCÈS DIRECT** : Via Supabase Dashboard SQL Editor
3. **CRÉATION NOUVEAU** : Admin de remplacement via SQL :
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'uuid-nouvel-admin';
   ```
4. **RÉVOCATION** : Ancien admin en mode `user`
5. **AUDIT** : Investigation complète des `audit_logs`

### Perte d'Accès Dashboard

1. **SQL DIRECT** : Via Supabase Dashboard
2. **VÉRIFICATION ROLES** :
   ```sql
   SELECT id, first_name, last_name, role, created_at
   FROM profiles WHERE role = 'admin';
   ```
3. **RESTAURATION** : Promotion d'un utilisateur de confiance
4. **VALIDATION** : Test des permissions via `/admin/security-test`

---

## 🔄 Évolutions Futures

### Prochaines Fonctionnalités

1. **Gestion complète des commandes** (`/admin/orders`)
   - Statuts de commande et workflow
   - Interface de suivi et livraison
   - Rapports de vente

2. **Analytics et métriques** (Dashboard principal)
   - KPIs de vente et performance
   - Graphiques d'évolution
   - Exports de données

3. **Notifications push**
   - Alertes temps réel pour admins non autorisés
   - Notifications de nouvelles commandes
   - Rapports automatisés

### Améliorations Techniques

1. **Cache distribué** : Redis pour multi-instances
2. **Permissions granulaires** : Système encore plus fin
3. **Monitoring avancé** : Intégration SIEM
4. **Tests automatisés** : Suite de tests E2E complète

---

## 📞 Support et Références

### Documentation

- **Ce document** : Documentation principale consolidée
- **Types TypeScript** : `src/lib/auth/types.ts`
- **Tests diagnostics** : `/admin/security-test`
- **Code source** : `src/lib/auth/admin-service.ts`

### Commandes Utiles

```bash
# Développement
npm run dev              # Démarrer en mode développement
npm run audit-roles      # Vérifier les admins
npm run lint            # Linting du code
npm run build           # Build production

# Supabase
supabase start          # Base locale
supabase db reset       # Reset avec migrations
supabase functions deploy # Déployer Edge Functions
```

### Contacts d'Urgence

- **Admin principal** : Défini par `ADMIN_PRINCIPAL_ID`
- **Email alertes** : Défini par `ADMIN_EMAIL`

---

**🔄 Dernière mise à jour système** : Juillet 2025
