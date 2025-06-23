# Documentation des Flux d'Authentification (Auth Flow)

## 1. Principes Fondamentaux

Ce document décrit les flux d'authentification et de gestion de session pour l'application HerbisVeritas. Le système repose sur Supabase pour l'authentification et la gestion des utilisateurs, et est intégré dans une application Next.js utilisant les Server Actions et les Server Components.

- **Source de Vérité :** Supabase Auth est la source de vérité unique pour l'identité et la session de l'utilisateur.
- **Logique Métier :** Les interactions avec Supabase Auth (connexion, inscription, etc.) sont encapsulées dans des **Server Actions** (`src/actions/`).
- **Sécurité :** Les routes sont protégées à l'aide d'un **middleware** (`src/middleware.ts`) qui vérifie la session de l'utilisateur à chaque requête. Les accès aux données sont contrôlés par les **Row Level Security (RLS)** de Supabase, qui s'appuient sur le rôle de l'utilisateur (`app_metadata.role` dans le JWT). Pour plus de détails sur la structure des tables et les politiques RLS, voir le [guide de la base de données](./DATABASE.md#schéma-des-tables).
- **Synchronisation Client :** L'état de l'interface utilisateur est synchronisé en temps réel avec l'état d'authentification grâce au listener `onAuthStateChange` de Supabase dans un composant client de layout (`src/components/layout/client-layout.tsx`).

---

## 2. Flux d'Authentification de Base

Ces flux sont principalement gérés dans `src/actions/auth.ts`. Pour une description détaillée de chaque action, consultez la [documentation des actions d'authentification](./ACTIONS.md#2-actions-dauthentification-srcactionsauthts).

### 2.1. Inscription (Sign Up)

1.  **Initiation :** L'utilisateur remplit le formulaire d'inscription.
2.  **Action :** La `signUpAction` est appelée.
3.  **Processus :**
    - Valide les entrées utilisateur avec Zod.
    - Appelle `supabase.auth.signUp()`.
    - L'option `emailRedirectTo` est utilisée pour spécifier l'URL de callback (`/auth/callback`) où l'utilisateur sera redirigé après avoir cliqué sur le lien de confirmation.
4.  **Confirmation :** Supabase envoie un email de confirmation à l'utilisateur. L'utilisateur n'est pas connecté tant que son email n'est pas vérifié. À la création de l'utilisateur dans `auth.users`, un [trigger](./DATABASE.md#triggers) (`handle_new_user`) crée une entrée correspondante dans la table `public.profiles`.

### 2.2. Connexion (Sign In)

1.  **Initiation :** L'utilisateur soumet le formulaire de connexion.
2.  **Action :** La `loginAction` est appelée.
3.  **Processus :**
    - Valide les entrées avec Zod.
    - Appelle `supabase.auth.signInWithPassword()` avec l'email et le mot de passe.
4.  **Résultat :** Si les identifiants sont corrects, Supabase crée une session et retourne un JWT. Le listener `onAuthStateChange` côté client détecte l'événement `SIGNED_IN` et met à jour l'application.

### 2.3. Déconnexion (Sign Out)

1.  **Initiation :** L'utilisateur clique sur le bouton de déconnexion.
2.  **Action :** La `logoutAction` est appelée.
3.  **Processus :** Appelle `supabase.auth.signOut()`.
4.  **Résultat :** La session est terminée. Le listener `onAuthStateChange` détecte l'événement `SIGNED_OUT`, ce qui déclenche le nettoyage de l'état local (ex: vidage du panier du store Zustand).

---

## 3. Gestion des Sessions et des Utilisateurs Anonymes

### 3.1. Protection des Routes (Middleware)

- Le fichier `src/middleware.ts` intercepte chaque requête vers une route protégée.
- Il utilise `supabase.auth.getUser()` pour vérifier si une session valide existe.
- Si l'utilisateur n'est pas authentifié, le middleware (via la logique de `next-intl`) le redirige vers la page de connexion.

### 3.2. Utilisateurs Anonymes (Invités)

Pour des fonctionnalités comme le panier invité, l'application a besoin d'une session même pour les utilisateurs non connectés.

- **Fichier Clé :** `src/lib/authUtils.ts`
- **Fonction :** `getActiveUserId()`
- **Processus :**
  1. Tente de récupérer l'utilisateur actuel avec `supabase.auth.getUser()`.
  2. Si aucun utilisateur n'est trouvé (l'utilisateur est un invité), la fonction appelle `supabase.auth.signInAnonymously()` pour créer une session anonyme.
  3. Cette session anonyme est utilisée pour lier des données (comme un panier) à cet invité spécifique. Voir la définition de la [table `carts`](./DATABASE.md#table-publiccarts) qui autorise un `user_id` nullable.

### 3.3. Synchronisation de l'État Côté Client

- **Fichier Clé :** `src/components/layout/client-layout.tsx`
- **Processus :**
  - Un `useEffect` s'abonne à `supabase.auth.onAuthStateChange`.
  - Cet écouteur réagit aux événements `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, etc.
  - Il permet de mettre à jour l'état global de l'application (via Zustand) et de déclencher des actions critiques, comme la fusion du panier invité avec le panier utilisateur lors d'un `SIGNED_IN`.

---

## 4. Gestion du Compte Utilisateur

Ces flux sont principalement gérés dans `src/app/[locale]/profile/actions.ts`.

### 4.1. Changement de Mot de Passe

Ce flux est sécurisé pour s'assurer que seul le propriétaire du compte peut changer son mot de passe.

1.  **Initiation :** L'utilisateur est sur sa page de profil et remplit le formulaire de changement de mot de passe (ancien mot de passe, nouveau, confirmation).
2.  **Action :** La `updatePasswordAction` est appelée.
3.  **Processus en plusieurs étapes :**
    a. **Vérification de la session :** `supabase.auth.getUser()` confirme que l'utilisateur est bien connecté.
    b. **Validation de l'ancien mot de passe :** La fonction tente de se reconnecter avec l'email de l'utilisateur et l'ancien mot de passe fourni (`supabase.auth.signInWithPassword()`). C'est une étape de vérification cruciale. Si elle échoue, l'action s'arrête.
    c. **Mise à jour du mot de passe :** Si l'étape précédente réussit, `supabase.auth.updateUser({ password: newPassword })` est appelée pour définir le nouveau mot de passe.
    d. **Déconnexion Forcée :** Après une mise à jour réussie, `supabase.auth.signOut()` est appelée pour invalider toutes les sessions existantes et forcer l'utilisateur à se reconnecter avec son nouveau mot de passe.
4.  **Résultat :** L'utilisateur est déconnecté et doit se reconnecter.

### 4.2. Mise à jour des Informations du Profil

- La mise à jour des informations de profil (nom, etc.) est gérée par la `updateUserProfile` action dans `src/actions/profileActions.ts`.
- Elle récupère l'utilisateur actuel et met à jour la [table `profiles`](./DATABASE.md#table-publicprofiles) correspondante en base de données.

---

## 5. Flux de Callback (`/auth/callback`)

La page `src/app/[locale]/auth/callback/page.tsx` est un point d'entrée central pour les flux initiés par un email.

- **Rôle :** Gérer les redirections depuis les emails de Supabase (confirmation d'inscription, réinitialisation de mot de passe, etc.).
- **Processus :**
  - C'est un Client Component qui utilise `onAuthStateChange`.
  - Lorsqu'un utilisateur atterrit sur cette page après avoir cliqué sur un lien magique ou de confirmation, le client Supabase JS traite automatiquement le token dans l'URL.
  - Cela déclenche un événement `SIGNED_IN`, qui est capturé par le listener.
  - Le composant affiche un message de statut (chargement, succès, erreur) et redirige l'utilisateur vers la page appropriée (définie par le paramètre `next` dans l'URL ou une page par défaut).
