# Plan d'Implémentation des Flux d'Authentification Améliorés

Ce document détaille les étapes pour implémenter des flux d'authentification robustes et conviviaux pour Herbis Veritas, en utilisant Next.js, Supabase, et `next-intl`.

## 1. Prérequis et Configuration Globale

### 1.1. Fichiers de Traduction pour les Callbacks - ✅ **Terminé**

- Créer un nouveau namespace de traduction `AuthCallback` (ex: `src/locales/fr/AuthCallback.json`, `src/locales/en/AuthCallback.json`).
- Y ajouter les clés pour les messages de chargement, succès, erreur, redirection (cf. exemples dans la discussion précédente, comme `loading`, `accountConfirmedSuccess`, `errorGeneric`, etc.).
- Mettre à jour `src/i18n.ts` pour charger ce nouveau namespace, en s'assurant que les messages sont correctement fusionnés pour `NextIntlClientProvider`.

### 1.2. Configuration Supabase (`emailRedirectTo`) - 🚧 **En Cours / Bloqué**

- Vérifier que l'URL du site dans Supabase (Auth > URL Configuration > Site URL) est correcte (ex: `http://localhost:3000` pour le développement, l'URL de production pour le déploiement).
- Les URLs `emailRedirectTo` sont construites dynamiquement côté **serveur** (dans `src/actions/auth.ts`) et incluent la locale, `type` et `next`. **Code implémenté.**
- **Point bloquant :** L'erreur persistante "Email link is invalid or has expired" suggère un problème de configuration des URL (Site URL / Redirect URLs) dans le tableau de bord Supabase. **Vérification en cours par l'utilisateur.**

### 1.3. Gestion Améliorée des Erreurs dans le Middleware (`src/middleware.ts`) - ✅ **Terminé**

- Concerne l'erreur `AuthApiError: User from sub claim in JWT does not exist` (code `user_not_found`).
- Lorsque cette erreur est détectée par `supabase.auth.getUser()` dans le middleware :
  - Continuer de logger l'erreur pour diagnostic.
  - S'assurer que la réponse (`response`) qui est retournée par le middleware contient des instructions pour effacer les cookies d'authentification Supabase (ex: `sb-access-token`, `sb-refresh-token`). Cela peut être fait en modifiant l'objet `response.cookies.set()` avec des options d'expiration passée pour ces cookies spécifiques si l'erreur `user_not_found` est rencontrée.
  - Le comportement actuel de traiter `user = null` et de laisser `next-intl` gérer la redirection vers la page de login (si la route est protégée) est globalement correct. Le nettoyage des cookies pour l'erreur `user_not_found` est implémenté et fonctionnel (confirmé par les logs).

## 2. Page de Callback Générique (`/auth/callback`) - ✅ **Implémentée (Débogage en cours lié au point 1.2)**

### 2.1. Création de la Page - ✅ **Terminé**

- Créer le fichier `src/app/[locale]/auth/callback/page.tsx`.
- Ce sera un Client Component (`"use client"`).
- La page devra utiliser `Suspense` de React car `useSearchParams()` (un Client Hook) sera utilisé pour lire les paramètres de l'URL.

### 2.2. Logique de la Page - ✅ **Implémentée (Ajustements récents effectués)**

- **Récupération des Paramètres :**
  - `locale` via `useParams()` (car Client Component).
  - `type`, `code` (utilisé comme `token_hash`), `error`, `error_description`, `next` via `useSearchParams()`. **Corrigé pour utiliser `code`.**
- **États (useState) :**
  - `status`: 'loading', 'success', 'error'.
  - `message`: Le message à afficher à l'utilisateur.
  - `finalRedirectPath`: Le chemin vers lequel rediriger après succès.
- **Initialisation (`useEffect` avec dépendances vides pour exécution au montage) :**
  - Déterminer `finalRedirectPath` basé sur le paramètre `next` (avec validation) ou une route par défaut. **Implémenté.**
  - Si `error` est présent dans les `searchParams`, mettre `status` à 'error' et `message` avec `errorDescription`. **Implémenté.**
- **Logique de Traitement dans `useEffect` :**
  - **Listener `onAuthStateChange` de Supabase :**
    - S'abonner à `supabase.auth.onAuthStateChange`.
    - Sur l'événement `SIGNED_IN` (indique une session active) :
      - Vérifier le `type` (ex: `signup`, `email_change`).
      - Mettre `status` à 'success', afficher le message approprié (ex: `AuthCallback.accountConfirmedSuccess`).
      - Utiliser `setTimeout` pour afficher le message pendant quelques secondes, puis rediriger vers `finalRedirectPath` en utilisant `useRouter` de `next-intl/navigation`.
    - Désabonnement du listener lors du démontage du composant (`authListener.subscription.unsubscribe()`). **Corrigé et implémenté.**
  - **Gestion de `token_hash` (pour `verifyOtp`) :**
    - Si `code` (utilisé comme `token_hash`) et `type` (`signup`, `invite`, `email_change`, etc., après validation du type) sont présents et qu'aucune erreur n'a été détectée via les `searchParams` : **Logique implémentée.**
      - Appeler `supabase.auth.verifyOtp({ type: otpTypeForVerification, token_hash: codeFromUrl })`. **Corrigé et implémenté.**
      - **Comportement actuel :** Cet appel retourne l'erreur "Email link is invalid or has expired" de Supabase, pointant vers un problème de configuration (voir 1.2).
    - Si succès : Mettre `status` à 'success', `message` approprié. L'événement `SIGNED_IN` de `onAuthStateChange` devrait normalement se déclencher. Si ce n'est pas le cas ou pour plus de contrôle, on peut forcer la redirection ici aussi.
    - Si erreur : Mettre `status` à 'error' et `message` avec les détails de l'erreur.
  - **Gestion Timeout/Accès Invalide :**
    - Si aucun paramètre pertinent n'est trouvé et qu'aucun événement `SIGNED_IN` n'est capturé après un court délai (ex: 10 secondes), mettre `status` à 'error' avec un message indiquant un problème ou un accès invalide.
- **Affichage (JSX) :**
  - Afficher conditionnellement une UI basée sur `status` (un spinner pour 'loading', le message de succès/erreur).
  - Utiliser `useTranslations('AuthCallback')` pour tous les textes affichés à l'utilisateur.
- **Redirection Finale :**
  - Utiliser `useRouter()` de `next-intl/navigation` pour s'assurer que la redirection est compatible avec la locale.

## 3. Flux Spécifiques et Mise à Jour des Formulaires Existants

### 3.1. Inscription (Signup)

- **Formulaire d'Inscription (`src/app/[locale]/register/page.tsx`) :**
  - Modifier la logique de soumission pour l'appel à `supabase.auth.signUp()`.
  - Dans les `options`, définir `emailRedirectTo` : `\${window.location.origin}/${locale}/auth/callback?type=signup&next=/${locale}/profile/account`. Le `next` peut être ajusté si une autre page de destination est souhaitée après la première connexion.
- **Page de Callback (`/[locale]/auth/callback` avec `type=signup`) :**
  - Le lien de confirmation d'email envoyé par Supabase mènera à cette URL.
  - La logique de `verifyOtp` (si le `type` est `signup` et `token_hash` est présent) ou `onAuthStateChange` (si le lien magique établit directement la session) s'appliquera comme décrit dans la section 2.2.

### 3.2. Réinitialisation de Mot de Passe

- **Page de Demande de Réinitialisation (`src/app/[locale]/forgot-password/page.tsx`) :**
  - Créer cette page si elle n'existe pas. Elle contiendra un formulaire pour entrer l'adresse email.
  - À la soumission, appeler `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
  - `redirectTo` devra pointer vers la page de mise à jour du mot de passe : `\${window.location.origin}/${locale}/auth/update-password`.
- **Page de Mise à Jour du Mot de Passe (`src/app/[locale]/auth/update-password/page.tsx`) :**
  - Créer cette page. Ce sera un Client Component.
  - Elle sera atteinte après que l'utilisateur ait cliqué sur le lien dans l'email de réinitialisation. Le client Supabase JS devrait automatiquement gérer le token présent dans l'URL (souvent dans le hash `#`) pour établir une session temporaire permettant la mise à jour.
  - **`useEffect` pour `onAuthStateChange` :** Écouter l'événement `PASSWORD_RECOVERY` pour confirmer que l'utilisateur est dans le bon état pour mettre à jour son mot de passe, ou simplement vérifier si `supabase.auth.getUser()` renvoie un utilisateur (même temporaire).
  - **Formulaire :** Champs pour "Nouveau mot de passe" et "Confirmer le nouveau mot de passe".
  - **Soumission du Formulaire :**
    - Appeler `await supabase.auth.updateUser({ password: newPassword })`.
    - Si succès : Afficher un message de succès (ex: `AuthCallback.passwordResetSuccess`). Rediriger vers `/[locale]/login` après un court délai, avec un message invitant à se connecter avec le nouveau mot de passe.
    - Si erreur : Afficher un message d'erreur approprié.
  - Utiliser `useTranslations('AuthCallback')` pour les messages.

### 3.3. Changement d'Email (depuis la page de profil)

- **Page de Profil (ex: `src/app/[locale]/profile/account/page.tsx`) :**
  - S'il y a une fonctionnalité pour changer l'email :
  - Lors de l'appel à `supabase.auth.updateUser({ email: newEmail })`, inclure l'option `emailRedirectTo`.
  - `emailRedirectTo` : `\${window.location.origin}/${locale}/auth/callback?type=email_change&next=/${locale}/profile/account`.
- **Page de Callback (`/[locale]/auth/callback` avec `type=email_change`) :**
  - Le lien de confirmation envoyé à la _nouvelle_ adresse email mènera ici.
  - La logique de `verifyOtp` s'appliquera.
  - Message de succès : `AuthCallback.emailVerifiedSuccess`.
  - Redirection vers `finalRedirectPath` (qui sera `/[locale]/profile/account` dans ce cas).

## 4. Tests et Validation Approfondis

- Pour chaque flux (inscription, réinitialisation MDP, changement d'email) :
  - Tester le cas nominal (succès).
  - Tester les cas d'erreur (lien expiré, token invalide, informations incorrectes).
- Vérifier que les redirections se font correctement et préservent/changent la locale comme attendu.
- S'assurer que tous les messages affichés à l'utilisateur sont traduits et clairs.
- Confirmer que les états de chargement sont bien gérés et évitent les écrans blancs.
- Valider que le problème `user_not_found` dans le middleware est correctement géré (cookies nettoyés, redirection vers login).
- Vérifier la console du navigateur et les logs du serveur Next.js pour toute erreur inattendue.

## 5. Structure des Fichiers (Récapitulatif des Nouveaux Fichiers/Modifications Majeures)

- **Nouveaux Fichiers :**
  - `src/app/[locale]/auth/callback/page.tsx`
  - `src/app/[locale]/auth/update-password/page.tsx`
  - `src/app/[locale]/forgot-password/page.tsx` (si non existant)
  - `src/locales/en/AuthCallback.json`
  - `src/locales/fr/AuthCallback.json`
- **Fichiers à Modifier :**
  - `src/i18n.ts` (pour ajouter le namespace `AuthCallback`)
  - `src/middleware.ts` (pour la gestion améliorée de l'erreur `user_not_found`)
  - `src/app/[locale]/register/page.tsx` (pour `emailRedirectTo`)
  - `src/app/[locale]/profile/account/page.tsx` (si changement d'email, pour `emailRedirectTo`)

---

Ce plan devrait servir de guide pour l'implémentation.
