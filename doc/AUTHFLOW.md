# Documentation des Flux d'Authentification (Auth Flow)

## 1. Principes Fondamentaux

Ce document décrit les flux d'authentification et de gestion de session pour l'application HerbisVeritas. Le système repose sur Supabase pour l'authentification et la gestion des utilisateurs, et est intégré dans une application Next.js utilisant les Server Actions et les Server Components.

- **Source de Vérité :** Supabase Auth est la source de vérité unique pour l'identité et la session de l'utilisateur.
- **Logique Métier :** Les interactions avec Supabase Auth (connexion, inscription, etc.) sont encapsulées dans des **Server Actions** (principalement dans `src/actions/auth.ts`).
- **Sécurité et Rôles :** La sécurité repose sur deux mécanismes clés :
  1.  **Middleware (`src/middleware.ts`) :** Protège les routes en vérifiant la session de l'utilisateur à chaque requête.
  2.  **Row Level Security (RLS) :** Contrôle l'accès aux données directement dans la base de données. Les politiques RLS s'appuient sur le rôle de l'utilisateur, qui est la **source de vérité unique**. Ce rôle est stocké dans les **`app_metadata.role` du JWT** et lu par des fonctions SQL comme `public.get_my_custom_role()`. Pour plus de détails, voir le [guide de la base de données](./DATABASE.md).
- **Synchronisation Client :** L'état de l'interface utilisateur est synchronisé en temps réel avec l'état d'authentification grâce au listener `onAuthStateChange` de Supabase dans un composant client de layout (`src/components/layout/client-layout.tsx`).

---

## 2. Flux d'Authentification de Base

Ces flux sont gérés dans `src/actions/authActions.ts`.

### 2.1. Inscription (Sign Up)

Le processus d'inscription est sécurisé pour éviter l'énumération d'utilisateurs et guider l'utilisateur.

1.  **Initiation :** L'utilisateur remplit le formulaire d'inscription.
2.  **Action :** La `signUpAction` est appelée.
3.  **Processus :**
    a. **Validation des entrées :** Les données du formulaire sont validées par un schéma Zod centralisé (`src/lib/validation/auth-schemas.ts`).
    b. **Vérification de l'e-mail (Pré-inscription) :** Pour éviter de créer un compte pour un e-mail déjà existant et pour des raisons de sécurité, un appel RPC est fait à la fonction SQL `check_email_exists(:email)`. Si la fonction retourne `true`, le processus s'arrête et informe l'utilisateur que l'e-mail est déjà utilisé.
    c. **Création de l'utilisateur :** Si l'e-mail est disponible, `supabase.auth.signUp()` est appelée. L'option `emailRedirectTo` est utilisée pour spécifier l'URL de callback (`/auth/callback`).
4.  **Confirmation :** Supabase envoie un e-mail de confirmation. L'utilisateur n'est pas connecté tant que son e-mail n'est pas vérifié. À la création dans `auth.users`, un [trigger](./DATABASE.md#triggers) (`handle_new_user`) crée une entrée correspondante dans la table `public.profiles`.

### 2.2. Connexion (Sign In)

1.  **Initiation :** Un utilisateur (potentiellement anonyme) soumet le formulaire de connexion.
2.  **Action :** La `loginAction` est appelée.
3.  **Processus :**
    a. L'action capture l'ID de l'utilisateur anonyme (`anonymous_user_id`) de la session en cours.
    b. Elle valide les entrées avec Zod, puis appelle `supabase.auth.signInWithPassword()`.
    c. Si la connexion réussit, elle appelle immédiatement l'action `migrateAndGetCart(anonymous_user_id)` pour fusionner le panier de l'invité avec celui de l'utilisateur authentifié.
4.  **Résultat :** Supabase crée une session authentifiée. Le client reçoit le résultat de l'action, y compris le panier fusionné, et l'UI est mise à jour.

### 2.3. Déconnexion (Sign Out)

1.  **Initiation :** L'utilisateur clique sur le bouton de déconnexion.
2.  **Action :** La `logoutAction` est appelée, qui exécute `supabase.auth.signOut()`.
3.  **Résultat :** La session est terminée. Supabase bascule automatiquement l'utilisateur vers une nouvelle session anonyme. Le listener `onAuthStateChange` détecte `SIGNED_OUT`, déclenchant le rechargement du panier pour la nouvelle session anonyme.

### 2.4. Validation Centralisée des Mots de Passe

Pour garantir la cohérence des mots de passe, la logique de validation est centralisée dans `src/lib/validation/auth-schemas.ts` et les composants d'UI associés (`src/components/domain/auth/password-strength.tsx`). Cette approche garantit que toute modification des règles de mot de passe est appliquée uniformément.

---

## 3. Flux de Réinitialisation de Mot de Passe

### Phase 1: Demande de Lien

1.  **Formulaire :** L'utilisateur saisit son e-mail sur la page `/forgot-password`.
2.  **Action Serveur :** `requestPasswordResetAction` appelle `supabase.auth.resetPasswordForEmail()`.
3.  **Sécurité :** Pour éviter l'énumération d'e-mails, la fonction retourne un succès, que l'e-mail existe ou non.
4.  **Envoi de l'E-mail :** Supabase envoie un lien de réinitialisation unique et à durée limitée.

### Phase 2: Mise à Jour

1.  **Redirection :** L'utilisateur clique sur le lien, arrive sur `/update-password`. Supabase vérifie le jeton et crée une session temporaire.
2.  **Formulaire :** L'utilisateur saisit son nouveau mot de passe.
3.  **Action Serveur :** `updatePasswordAction` (dans `src/actions/authActions.ts`) valide le mot de passe et appelle `supabase.auth.updateUser()`.
4.  **Résultat :** Si le succès, l'utilisateur est informé et doit se reconnecter.

---

## 4. Gestion des Sessions (Anonymes et Authentifiées)

### 4.1. Protection des Routes (Middleware)

Le fichier `src/middleware.ts` intercepte chaque requête. Il utilise `supabase.auth.getUser()` pour vérifier la session. Certaines routes (ex: `/profile`) nécessitent une session authentifiée (`is_anonymous = false`) et redirigent les utilisateurs anonymes vers la page de connexion.

### 4.2. Gestion des Utilisateurs Invités (Sessions Anonymes)

L'application **utilise pleinement les sessions anonymes de Supabase**. Chaque visiteur, dès sa première visite, se voit attribuer une session anonyme.

- **Principe :** Chaque utilisateur (invité ou non) possède un `auth.uid()` et une session valide. La distinction se fait via le `claim` `is_anonymous` dans le JWT.
- **Avantages :**
  - **Simplicité :** Pas besoin de gérer des `guestId` manuellement dans le `localStorage`.
  - **Sécurité Unifiée :** Les politiques RLS s'appliquent de la même manière à tous les utilisateurs en se basant sur `auth.uid()`. Il n'est pas nécessaire d'utiliser des privilèges `service_role` pour les opérations de panier.
- **Transition vers Authentifié :** Le flux de connexion (voir section 2.2) gère la transition transparente d'une session anonyme à une session authentifiée, y compris la migration des données comme le panier.

### 4.3. Synchronisation de l'État Côté Client

Le composant `src/components/layout/client-layout.tsx` utilise `useEffect` pour s'abonner à `supabase.auth.onAuthStateChange`. Cet écouteur est crucial :

- **`INITIAL_SESSION`**: Charge le panier initial de l'utilisateur (anonyme ou authentifié).
- **`SIGNED_IN`**: Déclenché après une connexion réussie. Le client est déjà à jour grâce au retour de la `loginAction`. L'écouteur peut rafraîchir des données supplémentaires si nécessaire.
- **`SIGNED_OUT`**: Déclenché après une déconnexion. Le client vide les données utilisateur et recharge le panier de la nouvelle session anonyme.

---

## 5. Gestion du Compte Utilisateur

Ces flux sont gérés dans `src/app/[locale]/profile/actions.ts`.

### 5.1. Changement de Mot de Passe (Authentifié)

1.  **Initiation :** L'utilisateur authentifié remplit le formulaire sur sa page de profil.
2.  **Action :** La `updatePasswordAction` est appelée.
3.  **Processus Sécurisé :**
    a. Valide les entrées (force du nouveau mot de passe, etc.).
    b. Vérifie la session de l'utilisateur.
    c. **Valide l'ancien mot de passe** en tentant une ré-authentification (`signInWithPassword`). C'est une étape de sécurité cruciale.
    d. Si l'ancien mot de passe est correct, met à jour avec `supabase.auth.updateUser()`.
    e. **Déconnexion forcée** de toutes les sessions avec `signOut()` pour des raisons de sécurité.
4.  **Résultat :** L'utilisateur est déconnecté et doit se reconnecter avec ses nouveaux identifiants.

### 5.2. Mise à jour des Informations du Profil

La mise à jour des informations (nom, etc.) est gérée par une action dédiée qui modifie les données dans la table `public.profiles`.

---

## 6. Flux de Callback (`/auth/callback`)

La page `src/app/[locale]/auth/callback/page.tsx` gère les redirections depuis les e-mails Supabase. C'est un Client Component qui attend l'événement `SIGNED_IN` déclenché par le traitement du token dans l'URL, puis redirige l'utilisateur de manière appropriée.

---

## Annexe : Gestion des Rôles et Permissions (RBAC)

Cette section documente le système de contrôle d'accès basé sur les rôles (RBAC).

### 1. Vue d'ensemble

Le système RBAC repose sur :

1.  **Les Rôles** : Identifiants définis dans l'application (ex: `admin`, `dev`, `user`).
2.  **Les Permissions** : Actions granulaires (ex: `products:create`, `orders:read:all`).
3.  **La Logique de Contrôle** : Fonctions vérifiant si un rôle possède une permission.

La **source de vérité unique** pour le rôle d'un utilisateur est la revendication (`claim`) **`app_metadata.role` dans le JWT**. Ce rôle est attribué manuellement ou via des fonctions serveur sécurisées.

### 2. Flux de Vérification d'une Permission

Le contrôle d'accès pour les routes sensibles (ex: `/admin`) est géré de manière centralisée.

**Étape 1 : Protection de la Route (Layout)**

- Le layout `src/app/[locale]/admin/layout.tsx` protège toutes les routes `/admin`.
- Il appelle une fonction de vérification, par exemple `checkUserPermission('admin:access')`.

**Étape 2 : Logique de Vérification Côté Serveur**

- La fonction `checkUserPermission` (ex: dans `src/lib/auth/server-auth.ts`) orchestre la vérification :
  1.  Elle récupère la session utilisateur via `supabase.auth.getUser()`.
  2.  Elle extrait le rôle des métadonnées du JWT (`user.app_metadata.role`).
  3.  Elle appelle `hasPermission(userRole, permission)` pour valider l'accès.
  4.  Elle retourne un résultat (`isAuthorized`, `user`, `role`, etc.).

**Étape 3 : Configuration des Rôles et Permissions**

- Le fichier `src/config/permissions.ts` est la source de vérité de la logique RBAC.
- Il contient la carte `permissionsByRole` qui associe à chaque rôle un tableau des permissions qu'il détient.

```typescript
// src/config/permissions.ts (exemple simplifié)
export const permissionsByRole: Record<AppRole, AppPermission[]> = {
  admin: [
    "admin:access",
    "products:*", // Wildcard pour toutes les actions sur les produits
  ],
  user: ["orders:read:own", "profile:update:own"],
};
```

**Étape 4 : Validation de la Permission**

- La fonction `hasPermission` (`src/lib/auth/utils.ts`) vérifie si le rôle de l'utilisateur possède la permission demandée, en tenant compte des wildcards (`*`).
