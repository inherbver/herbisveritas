# Politiques et Architecture de Sécurité

## 1. Principes Fondamentaux

La sécurité de HerbisVeritas est basée sur une approche de **défense en profondeur**, où plusieurs couches de sécurité indépendantes se superposent pour protéger l'application et les données des utilisateurs. La source de vérité pour l'identité est **Supabase Auth**, et les permissions sont contrôlées au plus près de la donnée via les **Row Level Security (RLS)** de PostgreSQL.

---

## 2. Couches de Sécurité (Défense en Profondeur)

### Couche 1 : Middleware Next.js

Le middleware (`src/middleware.ts`) est la première ligne de défense applicative.

- **Rôle :** Protéger les routes et valider la présence d'une session utilisateur valide pour les pages qui le nécessitent.
- **Fonctionnement :** Il intercepte les requêtes entrantes, vérifie la session avec Supabase, et redirige les utilisateurs non authentifiés vers la page de connexion si nécessaire.
- **Documentation :** Pour plus de détails, voir le [flux de gestion des sessions](./AUTHFLOW.md#31-protection-des-routes-middleware).

### Couche 2 : Server Actions & Logique Métier

Toute la logique métier est encapsulée dans des **Server Actions** (`src/actions/`).

- **Validation Stricte des Entrées :** Chaque action valide systématiquement ses données d'entrée avec **Zod**. Cela prévient les injections de données malformées.
- **Vérification de Session Côté Serveur :** Chaque action qui nécessite une authentification re-vérifie l'identité de l'utilisateur en appelant `supabase.auth.getUser()` côté serveur.
- **Protection CSRF :** Les Server Actions de Next.js intègrent une protection automatique contre les attaques de type Cross-Site Request Forgery (CSRF).
- **Documentation :** Voir la [documentation des actions](./ACTIONS.md).

### Couche 3 : Rôles et Permissions (Row Level Security)

C'est la couche de sécurité la plus critique, car elle est appliquée directement au niveau de la base de données.

- **Source de Vérité :** Les permissions sont basées sur le rôle de l'utilisateur, qui est stocké dans le **claim `app_metadata.role` du jeton JWT**.
- **Politiques RLS :** Des politiques RLS sont définies sur chaque table sensible. Elles filtrent les données pour s'assurer que les utilisateurs ne peuvent voir et modifier que les données auxquelles ils ont droit.
- **Documentation :** Les stratégies RLS sont détaillées dans le [guide de la base de données](./DATABASE.md#schéma-des-tables).

---

## 3. Rôles d'Accès

### 3.1. Source de Vérité des Rôles

**⚠️ INFORMATION OBSOLÈTE :** Cette section décrit l'ancien système.

**Nouveau système (2025) :** Le rôle d'un utilisateur est maintenant stocké dans la colonne `role` de la table `profiles` en base de données, avec un système de cache intelligent pour les performances. Voir [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md) pour les détails complets.

~~Le rôle d'un utilisateur (`admin`, `dev`, `user`) est déterminé **uniquement** par le claim `app_metadata.role` présent dans son jeton JWT Supabase. La colonne `role` dans la table `profiles` n'est plus utilisée comme source de vérité pour les permissions.~~

### 3.2. Niveaux d'Accès

**📋 MISE À JOUR 2025-01-19 :** Le système de rôles a été entièrement refactorisé. Pour la documentation complète du nouveau système, voir [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md).

**Résumé des changements :**

- ✅ Système unifié basé sur la base de données (au lieu de JWT)
- ✅ Cache intelligent pour les performances
- ✅ Types centralisés et permissions granulaires
- ✅ Audit et monitoring intégrés

Les niveaux d'accès ci-dessous restent conceptuellement valides mais l'implémentation a changé :

- **`anon` (Invité)**
  - **Permissions :**
    - Parcourir le site et consulter les produits.
    - Créer et gérer un panier.
  - **Mécanisme de Sécurité du Panier Invité (Session Anonyme) :**
    - Le système **utilise les sessions anonymes de Supabase**. Chaque visiteur reçoit un `auth.uid()` unique dès sa première visite.
    - Le panier est toujours lié à cet `auth.uid()`. Il n'y a pas de gestion manuelle d'ID invité.
    - La sécurité est assurée par les **politiques RLS** qui vérifient que `auth.uid() = carts.user_id`.
    - Les Server Actions n'ont pas besoin de s'exécuter avec des privilèges élevés (`service_role`) pour gérer le panier, ce qui renforce la sécurité.
  - **Restrictions :**
    - Ne peut pas accéder aux pages de profil ou de commande.
    - Doit s'inscrire ou se connecter pour finaliser une commande, ce qui déclenche un [flux de fusion de panier](./CART.md#32-flux-de-connexion-et-fusion).

- **`authenticated` (Utilisateur)**
  - **Permissions :**
    - Toutes les permissions de l'invité.
    - Accéder à son profil, gérer ses adresses, voir son historique de commandes.
    - Finaliser une commande.
  - **Restrictions :**
    - Ne peut voir et gérer que ses propres données (son profil, ses adresses, ses commandes, son panier).

- **`dev` (Développeur)**
  - **Permissions :**
    - Accès étendu en lecture/écriture sur la plupart des tables via les politiques RLS pour faciliter le débogage et la maintenance.
  - **Restrictions :**
    - N'a pas accès aux opérations les plus critiques réservées aux administrateurs.

- **`admin` (Administrateur)**
  - **Permissions :**
    - Accès complet à toutes les données de l'application.
    - Peut gérer les produits, les commandes de tous les utilisateurs, et les contenus du site.
  - **Utilisation :** Ce rôle est réservé aux opérations de gestion via une interface d'administration dédiée (non implémentée actuellement).

---

## 4. Flux de Paiement Sécurisé (Stripe Integration)

Le processus de paiement est une partie critique de l'application et a été conçu pour être aussi sécurisé que possible, en déléguant la gestion des informations de carte bancaire à Stripe et en protégeant chaque étape du flux.

### 4.1. Étape 1 : Création de la Session de Paiement (Côté Client -> Action Serveur)

1.  **Initiation Client :** L'utilisateur clique sur "Payer" dans son panier.
2.  **Appel à l'Action Serveur :** Le client appelle la `Server Action` **`createStripeCheckoutSession`**.
3.  **Validation Côté Serveur :**
    - L'action vérifie que l'utilisateur est bien **authentifié**.
    - Elle récupère le panier de l'utilisateur depuis la base de données.
    - **Crucial :** Pour éviter toute manipulation de prix côté client, l'action **ignore les prix venant du panier** et récupère les prix actuels des produits directement depuis la table `products` de la base de données.
    - Elle construit les `line_items` pour Stripe avec ces prix validés.
4.  **Création de la Session Stripe :** L'action communique avec l'API Stripe en utilisant la clé secrète (jamais exposée au client) pour créer une session de paiement.
    - Le `cart.id` est passé dans le champ `client_reference_id` pour pouvoir réconcilier la commande plus tard.
5.  **Redirection :** L'action retourne le `sessionId` au client, qui l'utilise pour rediriger l'utilisateur vers la page de paiement hébergée par Stripe. **Aucune donnée sensible ne transite par le client.**

### 4.2. Étape 2 : Traitement du Paiement (Webhook Stripe -> Edge Function Supabase)

1.  **Paiement Réussi :** L'utilisateur complète son paiement sur la page Stripe.
2.  **Notification Webhook :** Stripe envoie un événement `checkout.session.completed` à notre **Edge Function** Supabase (`/supabase/functions/stripe-webhook`).
3.  **Vérification de la Signature :**
    - La première étape de la fonction est de **vérifier la signature de l'événement** avec le secret du webhook (`STRIPE_WEBHOOK_SECRET`). Cela garantit que la requête provient bien de Stripe et n'a pas été falsifiée. Toute requête sans signature valide est immédiatement rejetée.
4.  **Appel à la Fonction RPC :**
    - Une fois l'événement validé, la fonction extrait le `client_reference_id` (qui est notre `cart_id`) et l'ID de l'utilisateur de la session Stripe.
    - Elle appelle ensuite la fonction PostgreSQL **`create_order_from_cart(cart_id)`**.

### 4.3. Étape 3 : Création de la Commande (Base de Données PostgreSQL)

1.  **Exécution de la RPC :** La fonction `create_order_from_cart` s'exécute dans la base de données.
2.  **Sécurité de la Fonction :**
    - Elle est définie avec `SECURITY DEFINER` pour s'exécuter avec les privilèges du créateur (un rôle de confiance), mais avec un `SET search_path = ''` pour prévenir les attaques de type "hijacking".
    - Le rôle `postgres` a reçu explicitement la permission `SELECT` sur `auth.users` pour pouvoir lier la commande à l'utilisateur, sans pour autant exposer d'autres permissions.
3.  **Logique Transactionnelle :**
    - La fonction lit les articles du panier spécifié.
    - Elle crée une nouvelle entrée dans la table `orders`.
    - Elle insère les articles correspondants dans la table `order_items`, en utilisant les prix actuels des produits pour une dernière validation.
    - Elle supprime le panier (`cart`) une fois la commande créée.
    - Toutes ces opérations sont implicitement transactionnelles au sein de la fonction.
4.  **Contrôle d'Accès Final :** Les nouvelles lignes dans `orders` et `order_items` sont immédiatement protégées par les politiques **RLS**, garantissant que seul l'utilisateur propriétaire pourra les consulter par la suite.

Ce flux garantit que les informations de paiement sont sécurisées par Stripe, que les prix ne peuvent pas être modifiés par l'utilisateur, que les notifications de paiement sont authentiques, et que la création de la commande est atomique et sécurisée au plus bas niveau.

---

## 5. Mesures Spécifiques

### 5.1. Gestion Sécurisée des Secrets

**⚠️ MISE À JOUR CRITIQUE - JANVIER 2025**

Suite à l'audit de sécurité, la gestion des secrets a été renforcée avec une nouvelle architecture :

#### Structure des Variables d'Environnement

- **Template de sécurité** : Utiliser `.env.example` comme template
- **Fichier local** : `.env.local` (JAMAIS commité dans Git)
- **Validation automatique** : `src/lib/config/env-validator.ts` vérifie la configuration au démarrage

#### Variables Publiques vs. Privées

```typescript
// Variables publiques (exposées côté client)
NEXT_PUBLIC_SUPABASE_URL; // ✅ Sûr
NEXT_PUBLIC_SUPABASE_ANON_KEY; // ✅ Sûr
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // ✅ Sûr

// Variables privées (serveur uniquement)
SUPABASE_SERVICE_ROLE_KEY; // 🚨 JAMAIS exposer côté client
STRIPE_SECRET_KEY; // 🚨 JAMAIS exposer côté client
STRIPE_WEBHOOK_SECRET; // 🚨 JAMAIS exposer côté client
```

#### Procédure en Cas d'Exposition

1. **URGENCE** : Révoquer immédiatement toutes les clés exposées
   - Supabase Dashboard → Settings → API → Regenerate
   - Stripe Dashboard → Developers → API Keys → Créer nouvelles clés
2. **Nettoyage** : Supprimer `.env.local` de l'historique Git si nécessaire
3. **Validation** : Utiliser le nouveau système de validation des variables

#### Configuration Production

- **Vercel/Netlify** : Variables configurées dans le dashboard
- **Monitoring** : Alertes activées sur tous les tableaux de bord
- **Rotation** : Secrets renouvelés tous les 90 jours

### 5.2. Headers de Sécurité

L'application implémente des headers de sécurité modernes via `next.config.mjs` :

```javascript
headers: [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' js.stripe.com; ...",
  },
];
```

### 5.3. Validation et Sanitisation

- **Validation d'entrée** : Tous les inputs utilisent des schémas Zod stricts
- **Sanitisation** : Aucun contenu utilisateur rendu directement sans échappement
- **Protection XSS** : Headers CSP et validation côté serveur

### 5.4. Autres Mesures

- **Politique de Mots de Passe :** Les exigences de complexité des mots de passe sont gérées par Supabase Auth.
- **Dépendances :** Les dépendances sont régulièrement auditées et mises à jour pour corriger les vulnérabilités connues.
- **Monitoring** : Logs de sécurité centralisés avec alertes automatiques
- **Réponse aux Incidents :** Procédure documentée pour identifier, contrôler, corriger et notifier en cas de brèche de sécurité.

---

## 6. Guide de Configuration Sécurisée

### 6.1. Installation Initiale

```bash
# 1. Copier le template
cp .env.example .env.local

# 2. Configurer les variables dans .env.local
# (Voir .env.example pour la structure)

# 3. Vérifier la configuration
npm run dev
# L'app refuse de démarrer si la config est invalide
```

### 6.2. Actions en Cas de Compromission

**IMMÉDIAT** :

1. STOPPER l'application
2. RÉVOQUER toutes les clés exposées
3. ANALYSER les logs d'accès
4. NOTIFIER l'équipe et les services tiers

**SUIVI** :

1. RÉGÉNÉRER avec de nouvelles clés
2. AUDITER le code pour d'autres vulnérabilités
3. RENFORCER les procédures de déploiement
4. DOCUMENTER l'incident pour apprentissage

### 6.3. Contacts d'Urgence

- **Stripe Security** : https://stripe.com/docs/security
- **Supabase Security** : security@supabase.io
- **Équipe Développement** : [À compléter]

---

**Dernière mise à jour sécurité** : 2025-01-19  
**Prochaine révision** : 2025-04-19
