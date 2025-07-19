# Gestion des Rôles et Permissions Admin

**Version :** 2.0 (Refactorisé - Janvier 2025)  
**Dernière mise à jour :** 2025-01-19

Ce document décrit l'architecture complète de gestion des rôles et permissions administrateur de HerbisVeritas, entièrement refactorisée pour plus de sécurité, performance et maintenabilité.

---

## 🏗️ Architecture Générale

### Principe Fondamental

Le système utilise une approche **base de données centrée** avec cache intelligent, abandonnant l'ancien système hardcodé pour une architecture évolutive et sécurisée.

### Source Unique de Vérité

- **Rôles stockés** : Table `profiles` en base de données
- **Cache performant** : Système de mise en cache en mémoire (TTL: 5 minutes)
- **Types unifiés** : `src/lib/auth/types.ts` comme référence centrale

---

## 🔐 Système de Rôles et Permissions

### Types de Rôles

```typescript
type UserRole = "user" | "editor" | "admin";
```

### Hiérarchie des Permissions

#### **👤 Utilisateur (`user`)**

- `orders:read:own` - Voir ses propres commandes
- `profile:read:own` - Voir son propre profil
- `profile:update:own` - Modifier son propre profil
- `content:read` - Lire le contenu public

#### **✏️ Éditeur (`editor`)**

- **Inclut toutes les permissions utilisateur PLUS :**
- `admin:access` - Accès au dashboard admin
- `products:read|create|update` - Gestion des produits
- `content:create|update|delete` - Gestion du contenu

#### **🛠️ Administrateur (`admin`)**

- **Inclut toutes les permissions éditeur PLUS :**
- `admin:read|write` - Accès complet admin
- `users:read:all|update:role|manage` - Gestion des utilisateurs
- `products:delete` - Suppression de produits
- `settings:view|update` - Configuration système
- `orders:read:all|update:status` - Gestion des commandes

### Permission Wildcard

Les administrateurs peuvent avoir la permission `*` qui donne accès à toutes les fonctionnalités.

---

## 🚀 Service Admin Unifié

### Fonctionnalités Principales

Le nouveau service (`src/lib/auth/admin-service.ts`) centralise toute la logique admin :

#### **1. Vérification de Rôle avec Cache**

```typescript
// Vérification rapide avec cache automatique
const result = await checkAdminRole(userId);
// result: { isAdmin: boolean, role: UserRole, permissions: string[] }
```

#### **2. Vérification de Permission Spécifique**

```typescript
// Vérifier une permission précise
const canManageUsers = await hasPermission(userId, "users:manage");
```

#### **3. Gestion des Rôles**

```typescript
// Service sécurisé pour les admins
const roleService = await createUserRoleService(adminUserId);
await roleService.assignRole(targetUserId, "editor");
await roleService.assignPermissions(targetUserId, ["products:read", "products:create"]);
```

#### **4. Audit et Sécurité**

```typescript
// Logging automatique des événements de sécurité
await logSecurityEvent({
  type: "admin_action",
  userId: adminId,
  details: { action: "role_change", target: userId },
});
```

---

## ⚡ Système de Cache Performant

### Mécanisme

- **Cache en mémoire** : Map JavaScript pour les performances
- **TTL intelligent** : 5 minutes pour les données standard, 1 minute pour l'admin d'urgence
- **Invalidation automatique** : Cache invalidé lors des changements de rôle
- **Nettoyage périodique** : Suppression automatique des entrées expirées

### Gestion du Cache

```typescript
// Invalider le cache d'un utilisateur spécifique
invalidateUserCache(userId);

// Invalider tout le cache (debugging)
invalidateAllCache();
```

---

## 🛡️ Sécurité Multi-Couches

### 1. Protection Middleware

Le middleware (`src/middleware.ts`) protège les routes admin :

```typescript
// Vérification automatique pour toutes les routes /admin/*
if (pathToCheck.startsWith("/admin")) {
  const adminCheck = await checkAdminRole(user.id);
  if (!adminCheck.isAdmin) {
    // Redirection + logging sécurité
  }
}
```

### 2. Row Level Security (RLS)

Les politiques de base de données garantissent la sécurité :

```sql
-- Seuls les admins peuvent voir tous les profils
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

### 3. Audit Complet

Tous les événements admin sont tracés dans `audit_logs` :

- Tentatives d'accès non autorisées
- Changements de rôles et permissions
- Actions administratives
- Événements de sécurité

---

## 📊 Monitoring et Surveillance

### Script d'Audit

```bash
# Exécuter l'audit des rôles admin
npm run audit-roles
```

Ce script vérifie :

- ✅ Admins autorisés vs non autorisés
- ⚠️ Comptes admin suspects
- 📋 Recommandations de sécurité

### Surveillance Temps Réel

Le système peut être étendu avec :

- **Alertes email** : Notification des admins non autorisés
- **Dashboard monitoring** : Interface de surveillance en temps réel
- **Logs centralisés** : Intégration avec des services de monitoring

---

## 🔧 Migration et Déploiement

### Migration des Données

La migration SQL (`supabase/migrations/20250119120000_add_role_based_admin_system.sql`) :

1. **Ajoute les colonnes** `role` et `permissions` à `profiles`
2. **Crée les index** de performance
3. **Met en place les RLS** policies
4. **Initialise l'admin principal** avec les bonnes permissions
5. **Crée la table d'audit** pour la sécurité

### Configuration Environnement

Variables requises dans `.env.local` :

```bash
# Admin principal (UUID de l'utilisateur)
ADMIN_PRINCIPAL_ID=your-admin-uuid

# Email pour les alertes de sécurité
ADMIN_EMAIL=admin@votredomaine.com
```

---

## 🧪 Tests et Validation

### Tests Unitaires

Le système inclut des tests complets :

- `src/lib/auth/__tests__/admin-service.test.ts` - Service principal
- `src/lib/auth/__tests__/types.test.ts` - Types et utilitaires

### Page de Test Sécurité

Une page dédiée (`/admin/security-test`) valide :

- ✅ Configuration des variables d'environnement
- ✅ Système de rôles et permissions
- ✅ Logging de sécurité
- ✅ Connexion base de données et RLS
- ✅ Accès aux logs d'audit

---

## 📚 Guide d'Utilisation

### Pour les Développeurs

#### 1. Vérifier les Permissions

```typescript
// Dans un Server Component
import { checkAdminRole } from "@/lib/auth/admin-service";

export default async function AdminPage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { isAdmin } = await checkAdminRole(user.id);

  if (!isAdmin) {
    redirect("/unauthorized");
  }

  // Page admin sécurisée
}
```

#### 2. Vérifier une Permission Spécifique

```typescript
import { hasPermission } from "@/lib/auth/admin-service";

// Server Action
export async function updateProduct(productId: string, data: FormData) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await hasPermission(user.id, "products:update"))) {
    throw new Error("Permission denied");
  }

  // Logique de mise à jour
}
```

#### 3. Gestion des Rôles (Admin uniquement)

```typescript
import { createUserRoleService } from "@/lib/auth/admin-service";

// Pour un admin qui veut modifier des rôles
export async function promoteToEditor(targetUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roleService = await createUserRoleService(user.id);
  await roleService.assignRole(targetUserId, "editor");

  // Le cache est automatiquement invalidé
}
```

### Pour les Administrateurs

#### 1. Surveillance des Admins

```bash
# Vérifier les admins non autorisés
npm run audit-roles

# Surveiller les logs de sécurité
# Via l'interface Supabase ou la page /admin/security-test
```

#### 2. Gestion des Utilisateurs

L'interface admin permet de :

- ✅ Voir tous les utilisateurs
- ✅ Modifier les rôles (user ↔ editor ↔ admin)
- ✅ Voir l'historique des actions
- ✅ Révoquer les accès suspects

---

## 🔄 Évolutions Futures

### Améliorations Prévues

1. **Cache distribué** : Redis pour les déploiements multi-instances
2. **Permissions granulaires** : Système de permissions encore plus fin
3. **Interface de monitoring** : Dashboard temps réel pour la surveillance
4. **Alertes avancées** : Notifications push et email automatiques
5. **Audit avancé** : Intégration avec des outils de SIEM

### Extensibilité

Le système est conçu pour facilement supporter :

- ✅ Nouveaux rôles (`moderator`, `support`, etc.)
- ✅ Permissions custom par ressource
- ✅ Intégration avec des services externes
- ✅ Multi-tenant si nécessaire

---

## 🚨 Procédures d'Urgence

### Compromission Suspectée

1. **IMMÉDIAT** : Exécuter `npm run audit-roles`
2. **ANALYSER** : Consulter `/admin/security-test` et les logs d'audit
3. **RÉVOQUER** : Supprimer les rôles admin suspects via Supabase Dashboard
4. **NOTIFIER** : Alerter l'équipe et documenter l'incident

### Admin Principal Compromis

1. **URGENCE** : Utiliser la fonction `isEmergencyAdmin()` avec `ADMIN_PRINCIPAL_ID`
2. **FALLBACK** : Accès direct via Supabase Dashboard
3. **RESTAURATION** : Créer un nouvel admin et révoquer l'ancien
4. **AUDIT** : Investigation complète des logs et actions récentes

---

## 📞 Support et Contact

- **Documentation technique** : Ce fichier et `/doc/SECURITY.md`
- **Tests en temps réel** : `/admin/security-test`
- **Logs d'audit** : Table `audit_logs` in Supabase
- **Code source** : `src/lib/auth/admin-service.ts`

---

**✅ Système opérationnel depuis** : Janvier 2025  
**🔄 Prochaine révision** : Avril 2025
