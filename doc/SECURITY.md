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

Le rôle d'un utilisateur (`admin`, `dev`, `user`) est déterminé **uniquement** par le claim `app_metadata.role` présent dans son jeton JWT Supabase. La colonne `role` dans la table `profiles` n'est plus utilisée comme source de vérité pour les permissions.

### 3.2. Niveaux d'Accès

- **`anon` (Invité)**

  - **Permissions :**
    - Parcourir le site et consulter les produits.
    - Créer et gérer un panier (via une session anonyme Supabase).
  - **Restrictions :**
    - Ne peut pas accéder aux pages de profil ou de commande.
    - Doit s'inscrire ou se connecter pour finaliser une commande.

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

- **Gestion des Secrets :** Toutes les clés d'API, secrets de JWT et autres informations sensibles sont gérés via des variables d'environnement et les secrets de Supabase. Ils ne sont jamais exposés côté client.
- **Politique de Mots de Passe :** Les exigences de complexité des mots de passe sont gérées par Supabase Auth.
- **Dépendances :** Les dépendances sont régulièrement auditées et mises à jour pour corriger les vulnérabilités connues.
- **Réponse aux Incidents :** Une procédure est en place pour identifier, contrôler, corriger et notifier en cas de brèche de sécurité.
