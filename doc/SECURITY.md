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

## 4. Mesures Spécifiques

- **Gestion des Secrets :** Toutes les clés d'API, secrets de JWT et autres informations sensibles sont gérés via des variables d'environnement (`.env.local`) et ne sont jamais exposés côté client.
- **Politique de Mots de Passe :** Les exigences de complexité des mots de passe sont gérées par Supabase Auth. Le flux de changement de mot de passe est sécurisé par la vérification de l'ancien mot de passe. Voir le [flux de changement de mot de passe](./AUTHFLOW.md#41-changement-de-mot-de-passe).

  - Toutes les fonctionnalités Guest
  - Gestion du compte
  - Historique des commandes
  - Gestion des adresses

- **Admin**

  - Accès complet à l'administration
  - Gestion des produits
  - Gestion des commandes
  - Tableau de bord

- **Tech** (Futur)
  - Accès technique limité
  - Maintenance système
  - Pas d'accès aux données critiques

## Sécurité des Données

### Authentification

- Sessions sécurisées (cookies httpOnly, secure)
- Hachage des mots de passe (via Supabase Auth)
- Protection contre les attaques par force brute

### Protection des Données

- Chiffrement des données sensibles
- Sauvegardes régulières
- Conformité RGPD

## Bonnes Pratiques

### Développement

- Jamais de secrets dans le code
- Validation stricte des entrées
- Gestion sécurisée des erreurs
- Mise à jour régulière des dépendances

### Infrastructure

- Sécurisation des accès SSH
- Surveillance des logs
- Mises à jour de sécurité

## Réponse aux Incidents

### Procédure en Cas de Brèche

1. Identification de la faille
2. Contrôle des dégâts
3. Correction de la vulnérabilité
4. Notification des utilisateurs si nécessaire
5. Analyse post-mortem

### Contacts de Sécurité

- Responsable Sécurité: [email protégé]
- Support Technique: [email protégé]

## Audit et Conformité

### Vérifications Régulières

- Scans de vulnérabilités
- Tests d'intrusion
- Revue des logs d'accès

### Conformité

- RGPD
- PCI DSS (pour les paiements)
- Hébergement des données en Europe
