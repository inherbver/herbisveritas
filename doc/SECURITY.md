# Architecture et Politiques de Sécurité

## 1. Principes Fondamentaux

La sécurité de HerbisVeritas repose sur une architecture de **défense en profondeur** avec plusieurs couches de protection indépendantes. L'identité est gérée par **Supabase Auth**, les permissions par un système **RBAC (Role-Based Access Control)** centralisé, et la sécurité des données par **Row Level Security (RLS)** PostgreSQL.

### 1.1. Principes de Base

- **Zero Trust** : Aucune confiance implicite, vérification à chaque couche
- **Principe du Moindre Privilège** : Permissions minimales nécessaires
- **Sécurité par Défaut** : Accès refusé sauf autorisation explicite
- **Audit Trail** : Traçabilité complète des actions sensibles

---

## 2. Architecture de Sécurité Multi-Couches

### Couche 1 : Middleware Next.js (`src/middleware.ts`)

**Premier point de contrôle** pour la protection des routes.

- **Routes Protégées :**
  - `/profile/*` : Utilisateurs authentifiés uniquement
  - `/admin/*` : Vérification admin via base de données + cache
- **Gestion des Sessions :** Validation continue des tokens Supabase
- **Redirections Sécurisées :** Nettoyage automatique des cookies corrompus
- **Logging de Sécurité :** Événements d'accès non autorisé dans `audit_logs`

### Couche 2 : Server Actions (`src/actions/`)

**Protection de la logique métier** avec validation stricte.

- **Validation Zod** : Tous les inputs validés avec des schémas stricts
- **Wrapper de Permissions** : `withPermissionSafe()` pour les actions sensibles
- **Vérification de Session** : Re-vérification `auth.getUser()` à chaque action
- **Protection CSRF** : Intégrée par Next.js Server Actions

### Couche 3 : Authentification et Autorisations (`src/lib/auth/`)

**Système centralisé de gestion des rôles et permissions.**

#### 3.1. Service Admin (`admin-service.ts`)

- **Cache Intelligent** : Mise en cache des permissions (5min TTL)
- **Vérification DB** : Source de vérité dans `profiles.role`
- **Fonctions Clés :**
  - `checkAdminRole(userId)` : Vérification avec cache
  - `hasPermission(userId, permission)` : Contrôle granulaire
  - `logSecurityEvent(event)` : Audit automatique

#### 3.2. Système RBAC (`types.ts`)

```typescript
// Rôles disponibles
type UserRole = "user" | "editor" | "admin";

// Permissions granulaires (20+ permissions)
type AppPermission =
  | "admin:access"
  | "admin:read"
  | "admin:write"
  | "products:read"
  | "products:create"
  | "products:update"
  | "products:delete"
  | "users:read:all"
  | "users:update:role"
  | "users:manage"
  | "orders:read:all"
  | "orders:update:status";
// ... et plus
```

#### 3.3. Niveaux d'Accès

| Rôle         | Permissions                               | Description                     |
| ------------ | ----------------------------------------- | ------------------------------- |
| **`user`**   | `orders:read:own`, `profile:*:own`        | Utilisateur standard            |
| **`editor`** | `admin:access`, `products:*`, `content:*` | Gestion produits/contenu        |
| **`admin`**  | Toutes sauf `users:delete`                | Contrôle total de l'application |

### Couche 4 : Row Level Security (RLS) PostgreSQL

**Protection au niveau des données** avec plus de 80 politiques actives.

#### 4.1. Fonctions RLS Utilitaires

```sql
-- Fonctions d'identification
current_user_id()           -- auth.uid() avec fallback
get_my_custom_role()        -- Rôle depuis profiles.role
is_current_user_admin()     -- Vérification admin
is_current_user_dev()       -- Vérification dev (obsolète)
is_service_context()        -- Contexte service/système
```

#### 4.2. Politiques par Table

**Profiles :**

- Users : SELECT/UPDATE propre profil uniquement
- Admins : Full CRUD sur tous les profils

**Products :**

- Public : SELECT produits actifs uniquement
- Admins : Full CRUD sur tous les produits
- Editors : Full CRUD sur tous les produits

**Carts & Cart Items :**

- Authenticated : Full CRUD sur panier propre (`user_id = auth.uid()`)
- Guests : Full CRUD sur panier propre (`guest_id` via JWT)
- Admins/Devs : Full access tous paniers

**Orders & Order Items :**

- Users : SELECT commandes propres uniquement
- Service Role : Full CRUD (pour webhook Stripe)
- Admins implicite via service role

**Addresses :**

- Users : Full CRUD adresses propres (`user_id = auth.uid()`)
- Admins : Full CRUD toutes adresses

---

## 3. Gestion des Sessions et Identité

### 3.1. Utilisateurs Authentifiés

- **Identification** : `auth.uid()` de Supabase Auth
- **Session Management** : Tokens JWT avec refresh automatique
- **Profil Lié** : Création automatique dans `profiles` via trigger

### 3.2. Utilisateurs Invités

- **Identification Hybride** :
  - Cookie `herbis-cart-id` côté client
  - Champ `guest_id` dans `carts` côté serveur
- **Limitations** : Accès panier uniquement, pas de profil
- **Migration** : Fusion automatique panier à la connexion

### 3.3. Fusion de Paniers

Processus sécurisé orchestré par `migrateAndGetCart()` :

1. Récupération paniers invité/authentifié
2. Fusion transactionnelle via RPC `merge_carts()`
3. Suppression utilisateur invité anonyme
4. Log de sécurité de l'opération

---

## 4. Flux de Paiement Sécurisé (Stripe)

### 4.1. Création Session (Server Action)

1. **Validation Utilisateur** : Vérification authentification
2. **Récupération Panier** : Source de vérité base de données
3. **Validation Prix** : Re-vérification prix depuis `products`
4. **Session Stripe** : Création avec `cart.id` en référence
5. **Aucune Donnée Sensible** : Jamais transitée côté client

### 4.2. Webhook Stripe (Edge Function)

1. **Vérification Signature** : `STRIPE_WEBHOOK_SECRET` obligatoire
2. **Extraction Données** : `client_reference_id` = `cart.id`
3. **RPC Sécurisée** : `create_order_from_cart_rpc()` transactionnelle
4. **Service Role** : Privilèges élevés pour création commande

### 4.3. Création Commande (PostgreSQL)

```sql
-- Fonction sécurisée avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_order_from_cart_rpc(p_cart_id UUID)
RETURNS jsonb
SECURITY DEFINER  -- Exécution avec privilèges créateur
SET search_path = '' -- Protection contre hijacking
```

---

## 5. Mesures de Sécurité Spécifiques

### 5.1. Gestion Sécurisée des Secrets

#### Variables d'Environnement

```bash
# Variables publiques (exposées côté client)
NEXT_PUBLIC_SUPABASE_URL=           # ✅ Sûr
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # ✅ Sûr
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # ✅ Sûr

# Variables privées (serveur uniquement)
SUPABASE_SERVICE_ROLE_KEY=          # 🚨 JAMAIS côté client
STRIPE_SECRET_KEY=                  # 🚨 JAMAIS côté client
STRIPE_WEBHOOK_SECRET=              # 🚨 JAMAIS côté client
ADMIN_PRINCIPAL_ID=                 # 🚨 UUID admin principal
```

#### Validation Automatique

- **Validateur Env** : `src/lib/config/env-validator.ts`
- **Vérification Démarrage** : Application refuse de démarrer si config invalide
- **Template Sécurisé** : `.env.example` comme référence

### 5.2. Headers de Sécurité (`next.config.mjs`)

```javascript
headers: [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "default-src 'self'; ..." },
];
```

### 5.3. Audit et Monitoring

#### Table d'Audit (`audit_logs`)

```sql
-- Événements tracés automatiquement
- unauthorized_admin_access  -- Tentative accès admin non autorisé
- successful_admin_login     -- Connexion admin réussie
- admin_action              -- Actions administratives
- role_change               -- Modifications de rôles
- auth_events               -- Événements d'authentification
```

#### Logs de Sécurité

- **Console Logs** : Actions sensibles loggées avec niveau approprié
- **Base de Données** : Événements persistés dans `audit_logs`
- **Fallback** : Console si DB indisponible

### 5.4. Protection Contre les Vulnérabilités

#### Injection SQL

- **Parameterized Queries** : Toujours via Supabase client
- **RLS** : Filtrage automatique au niveau DB
- **Validation Zod** : Sanitisation stricte des inputs

#### XSS (Cross-Site Scripting)

- **CSP Headers** : Content Security Policy restrictive
- **Échappement React** : Automatique pour tous les contenus
- **Validation Inputs** : Tous les contenus utilisateur validés

#### CSRF (Cross-Site Request Forgery)

- **Server Actions** : Protection intégrée Next.js
- **SameSite Cookies** : Configuration sécurisée par défaut
- **Tokens CSRF** : Gérés automatiquement par Supabase

#### Injection de Dépendances

- **Lock Files** : `package-lock.json` committé
- **Audit Dépendances** : `npm audit` en CI/CD
- **Mise à jour** : Dépendances critiques mises à jour rapidement

---

## 6. Procédures de Sécurité

### 6.1. Configuration Initiale Sécurisée

```bash
# 1. Copier le template
cp .env.example .env.local

# 2. Configurer les variables (voir .env.example)
# 3. Valider la configuration
npm run dev  # Échec si configuration invalide
```

### 6.2. Gestion des Incidents

#### Procédure d'Urgence

1. **STOPPER** immédiatement l'application
2. **RÉVOQUER** toutes les clés API exposées
3. **ANALYSER** les logs d'accès et audit_logs
4. **NOTIFIER** équipe et services tiers (Stripe, Supabase)

#### Récupération

1. **RÉGÉNÉRER** nouvelles clés API
2. **AUDITER** codebase pour autres vulnérabilités
3. **TESTER** configuration sécurisée
4. **REDÉPLOYER** avec nouvelles clés
5. **DOCUMENTER** incident et leçons apprises

### 6.3. Maintenance Sécurité

#### Tâches Périodiques

- **Rotation Secrets** : Tous les 90 jours
- **Audit Permissions** : `npm run audit-roles` mensuel
- **Review Logs** : Analyse `audit_logs` hebdomadaire
- **Mise à jour Deps** : Patches sécurité immédiatement

#### Monitoring Continu

- **Dashboard Supabase** : Alertes activées
- **Dashboard Stripe** : Monitoring des webhooks
- **Logs Next.js** : Surveillance erreurs et warnings
- **Cache Admin** : Monitoring performance et hits

---

## 7. Architecture de Déploiement Sécurisé

### 7.1. Environnements

- **Development** : `.env.local` avec clés de test
- **Staging** : Variables d'environnement Vercel/Netlify
- **Production** : Variables chiffrées, rotation automatique

### 7.2. CI/CD Sécurisé

- **Audit de Code** : ESLint avec règles de sécurité
- **Scan Vulnérabilités** : `npm audit` obligatoire
- **Test Sécurité** : Tests automatisés des permissions
- **Variables Secrets** : Jamais dans les logs de build

---

**Dernière mise à jour sécurité** : 2025-01-21  
**Prochaine révision** : 2025-04-21
**Responsable Sécurité** : Équipe Développement
