# Système de Sécurité Admin

## Vue d'ensemble

Le système de sécurité admin de l'application In Herbis Veritas utilise une architecture multicouche pour garantir que seuls les utilisateurs autorisés peuvent accéder aux fonctionnalités d'administration.

## Architecture de Sécurité

### 1. Vérification au Niveau Middleware (Serveur)

- **Fichier**: `src/middleware.ts`
- **Fonction**: Première ligne de défense côté serveur
- Vérifie l'authentification et le rôle avant même que la requête n'atteigne l'application
- Redirige vers `/unauthorized` si l'accès est refusé
- Enregistre les tentatives d'accès non autorisées dans `audit_logs`

### 2. Composant Header avec Cache Intelligent

- **Fichier**: `src/components/layout/header.tsx`
- **Caractéristiques**:
  - Cache de 5 minutes pour optimiser les performances
  - Prévention des vérifications concurrentes
  - Détection immédiate des changements d'authentification
  - Vérification périodique automatique
  - Double validation (rôle + permissions)

### 3. Protection des Composants (AdminGuard)

- **Fichier**: `src/components/auth/admin-guard.tsx`
- **Usage**:

```tsx
<AdminGuard redirectTo="/unauthorized">
  <AdminContent />
</AdminGuard>
```

- Vérification côté client indépendante
- Détection des incohérences de rôles
- Redirection automatique si non autorisé

### 4. Hook Réutilisable

- **Fichier**: `src/hooks/use-admin-status.ts`
- **Usage**:

```tsx
const { isAdmin, isLoading, role, error } = useAdminStatus();
```

## Flux de Vérification

1. **Connexion**: L'utilisateur se connecte avec ses identifiants
2. **Middleware**: Vérifie le token JWT et le rôle dans la base de données
3. **Header**: Détecte le changement d'état et met à jour l'affichage
4. **Navigation Admin**: Le lien admin apparaît uniquement si autorisé
5. **Protection des Pages**: AdminGuard vérifie à nouveau l'accès
6. **Audit**: Toutes les tentatives d'accès sont enregistrées

## Principes de Sécurité

### Fail-Safe

- En cas d'erreur ou de doute, l'accès est toujours refusé
- Les erreurs réseau ou de base de données entraînent un refus d'accès

### Defense in Depth

- Plusieurs couches de vérification indépendantes
- Si une couche échoue, les autres protègent toujours

### Least Privilege

- Accès minimal par défaut
- Les utilisateurs doivent explicitement avoir le rôle `admin`

### Validation Stricte

- Vérification du rôle dans la table `profiles`
- Vérification du statut du compte (actif, suspendu, supprimé)
- Vérification des permissions spécifiques

## Configuration des Rôles

Les rôles sont définis dans `src/lib/auth/types.ts`:

- `user`: Utilisateur standard
- `editor`: Éditeur de contenu
- `admin`: Administrateur avec accès complet

## Gestion des Sessions

### Cache et Performance

- Cache de 5 minutes pour réduire les requêtes à la base de données
- Invalidation automatique du cache lors des changements d'état
- Vérification périodique pour détecter les changements externes

### Événements Surveillés

- `SIGNED_IN`: Connexion d'un utilisateur
- `SIGNED_OUT`: Déconnexion
- `USER_UPDATED`: Mise à jour du profil
- `TOKEN_REFRESHED`: Renouvellement du token

## Audit et Logging

Tous les événements de sécurité sont enregistrés:

- Tentatives d'accès non autorisées
- Changements de rôles
- Actions administratives
- Erreurs de vérification

Les logs sont stockés dans la table `audit_logs` avec:

- `user_id`: Identifiant de l'utilisateur
- `action`: Type d'action tentée
- `resource`: Ressource concernée
- `details`: Détails JSON de l'événement
- `created_at`: Timestamp de l'événement

## Meilleures Pratiques

1. **Ne jamais faire confiance au client seul**: Toujours vérifier côté serveur
2. **Utiliser HTTPS en production**: Pour protéger les tokens en transit
3. **Rotation régulière des tokens**: Les tokens expirent et sont renouvelés automatiquement
4. **Monitoring actif**: Surveiller les logs d'audit pour détecter les anomalies
5. **Principe du moindre privilège**: N'accorder que les permissions nécessaires

## Dépannage

### Le lien Admin n'apparaît pas après connexion

1. Vérifier que l'utilisateur a bien le rôle `admin` dans la table `profiles`
2. Vérifier que le statut du compte est `active`
3. Rafraîchir la page après connexion
4. Vérifier les logs de la console pour les erreurs

### Accès refusé malgré le rôle admin

1. Vérifier que le token JWT n'est pas expiré
2. Vérifier les logs d'audit pour les détails du refus
3. S'assurer que les cookies sont activés dans le navigateur
4. Vérifier que les politiques RLS permettent l'accès

## Tests de Sécurité

Pour tester le système:

1. Essayer d'accéder à `/admin` sans être connecté → Redirection vers login
2. Se connecter avec un compte non-admin → Redirection vers unauthorized
3. Modifier le rôle dans la console → AdminGuard détecte et bloque
4. Suspendre un compte admin → Accès immédiatement révoqué
