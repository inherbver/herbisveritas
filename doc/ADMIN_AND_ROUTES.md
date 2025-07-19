# ⚠️ DOCUMENTATION OBSOLÈTE

**Ce fichier a été remplacé par :** [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md)

**Raison :** Le système de gestion des rôles admin a été entièrement refactorisé en janvier 2025. Cette documentation décrit l'ancien système basé sur JWT qui n'est plus utilisé.

**Veuillez consulter :** [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md) pour la documentation à jour du nouveau système unifié.

---

# ~~Plan d'Implémentation : Dashboard Admin et RBAC~~ [OBSOLÈTE]

~~**Objectif Principal :** Mettre en place une section `/admin` sécurisée, accessible uniquement aux utilisateurs ayant le rôle 'admin', et commencer à y intégrer des fonctionnalités d'administration, en commençant par la gestion des utilisateurs.~~

---

## Phase 1: Sécurisation des Routes et des Données (Fondations)

1.  **Amélioration du `middleware.ts` pour la Protection des Routes Admin :**
    - **Logique :**
      - Détecter les requêtes ciblant les URL sous `/admin/**`.
      - Pour ces routes, vérifier si l'utilisateur est authentifié.
      - Si authentifié, inspecter le JWT de la session pour extraire son rôle (`app_metadata.role`).
      - Si l'utilisateur n'est pas authentifié ou si son rôle n'est pas `'admin'`, le rediriger vers une page appropriée (ex: page de connexion, page d'accueil, ou une page "accès refusé" générique).
    - **Fichier à modifier :** `src/middleware.ts`

2.  **Création d'un Layout Spécifique pour la Section Admin :**
    - **Objectif :** Fournir une structure commune (navigation admin, en-tête) et une couche de sécurité supplémentaire pour toutes les pages admin.
    - **Logique dans le layout :**
      - Ce layout (`src/app/[locale]/admin/layout.tsx`) s'appliquera à toutes les routes enfants sous `/admin`.
      - Au chargement du layout (côté serveur), récupérer la session et le rôle de l'utilisateur.
      - Si l'utilisateur n'a pas le rôle 'admin', afficher un composant "Accès Refusé" ou rediriger (complémentaire au middleware).
    - **Nouveau fichier :** `src/app/[locale]/admin/layout.tsx`

3.  **Sécurisation des Actions Serveur (Server Actions) pour les Opérations Admin :**
    - **Contexte :** Des `// TODO` existent dans `profileStore.ts` pour des actions admin comme `fetchUserProfileForAdmin` et `updateUserProfileByAdmin`.
    - **Logique :**
      - Créer un nouveau fichier pour les actions serveur dédiées à l'administration (ex: `src/actions/adminActions.ts`).
      - Au début de chaque action serveur destinée à être appelée par un admin :
        - Récupérer la session de l'utilisateur et son rôle.
        - Si l'utilisateur n'est pas 'admin', retourner une erreur explicite (ex: `{ success: false, error: 'Unauthorized' }`).
    - **Nouveaux fichiers/modifications :**
      - `src/actions/adminActions.ts` (nouveau)
      - `src/stores/profileStore.ts` (pour appeler ces nouvelles actions sécurisées)

4.  **Mise en Place de Politiques RLS (Row Level Security) sur Supabase :**
    - **Objectif :** S'assurer que même si un utilisateur non-admin parvenait à appeler une API, la base de données elle-même empêcherait l'accès non autorisé aux données.
    - **Logique :**
      - **Table `profiles` :**
        - **SELECT :** Les admins peuvent voir tous les profils. Les utilisateurs peuvent voir leur propre profil.
        - **UPDATE :** Les admins peuvent mettre à jour tous les profils. Les utilisateurs peuvent mettre à jour leur propre profil (pour les champs autorisés).
          - Exemple de politique RLS pour l'accès admin, en utilisant la fonction helper qui lit le rôle depuis le JWT :

            ```sql
            -- Politique pour permettre aux admins de tout voir sur la table 'profiles'
            CREATE POLICY "Admins can view all profiles"
            ON public.profiles FOR SELECT
            TO authenticated
            USING ( public.is_current_user_admin() );

            -- Politique pour permettre aux admins de tout modifier sur la table 'profiles'
            CREATE POLICY "Admins can update all profiles"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING ( public.is_current_user_admin() );
            ```

          - **Note :** Ces politiques doivent être combinées avec celles permettant aux utilisateurs de gérer leur propre profil. La source de vérité du rôle est la fonction `public.get_my_custom_role()` qui inspecte le JWT, et non la colonne `profiles.role`.

      - **Autres tables (si applicable) :** Définir des politiques similaires pour les tables que les admins gèreront (ex: `products`, `orders`).

    - **Outil :** Via le dashboard Supabase SQL Editor ou des fichiers de migration.

---

## Phase 2: Construction du Dashboard Admin (Interface Utilisateur)

5.  **Création de la Page d'Accueil du Dashboard Admin :**
    - **Objectif :** Une page de base pour la section admin.
    - **Nouveau fichier :** `src/app/[locale]/admin/dashboard/page.tsx`
    - Contenu initial simple (ex: "Bienvenue sur le Dashboard Admin").

6.  **Mise en Place d'une Première Fonctionnalité : Gestion des Utilisateurs (Liste) :**
    - **Objectif :** Afficher la liste des utilisateurs pour les admins.
    - **Page :** `src/app/[locale]/admin/users/page.tsx`
    - **Logique :**
      - Cette page (Server Component) appellera une action serveur (ex: `fetchAllUsersForAdmin` depuis `adminActions.ts`) qui, elle-même, sera sécurisée (vérification du rôle admin) et récupérera les utilisateurs grâce aux RLS permissives pour les admins.
      - Afficher les utilisateurs dans un tableau.

7.  **(Optionnel, pour plus tard) Fonctionnalité : Édition d'Utilisateur par l'Admin :**
    - **Page :** `src/app/[locale]/admin/users/[userId]/edit/page.tsx`
    - **Logique :**
      - Formulaire pré-rempli avec les données de l'utilisateur (récupérées via une action serveur sécurisée).
      - Soumission du formulaire appelle une action serveur sécurisée (ex: `updateUserProfileByAdmin`) pour mettre à jour les informations, y compris potentiellement le rôle.

---

## Prochaines Étapes

Commencer par les étapes de la **Phase 1**, en particulier les points 1 (middleware) et 2 (layout admin), car ils constituent la base de la sécurité de la section admin.
