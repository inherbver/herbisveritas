# Fix: Problème de timing entre connexion admin et affichage des liens

## Contexte du problème

Après connexion d'un administrateur, l'utilisateur était redirigé vers `/shop` mais les liens admin dans le header n'apparaissaient pas immédiatement. L'utilisateur devait rafraîchir manuellement la page ou naviguer vers une autre page pour voir les liens admin.

## Analyse du problème

### Causes identifiées

1. **Race Condition dans l'initialisation** :
   - Le composant `Header` s'initialisait avec le cache sessionStorage
   - Le composant `HeaderClient` faisait un appel asynchrone à `supabase.auth.getSession()`
   - Ces deux processus n'étaient pas synchronisés

2. **Redirection trop rapide** :
   - `loginAction` redirige immédiatement après connexion réussie
   - Les composants client n'avaient pas le temps de traiter l'événement `SIGNED_IN`

3. **Vérifications non coordonnées** :
   - Double vérification (session + rôle admin) non coordonnée
   - Résultats temporairement incohérents

4. **Cache sessionStorage incomplet** :
   - Pas de système de validation temporelle
   - Cache pouvait être périmé

## Solution implémentée

### 1. Délai de synchronisation dans loginAction

```typescript
// Délai court pour permettre la propagation de l'état d'authentification
await new Promise(resolve => setTimeout(resolve, 100));
redirect("/fr/shop");
```

### 2. Système de retry dans checkAdminStatus

```typescript
const checkAdminStatus = useCallback(async (retryCount = 0) => {
  // Si pas d'utilisateur au premier essai, retry après 200ms
  if (userError || !user) {
    if (retryCount > 0) {
      // Arrêter après retry
    } else {
      setTimeout(() => checkAdminStatus(retryCount + 1), 200);
      return;
    }
  }
  
  // Si profil non trouvé (erreur PGRST116), retry après 300ms
  if (profileError?.code === 'PGRST116' && retryCount === 0) {
    setTimeout(() => checkAdminStatus(retryCount + 1), 300);
    return;
  }
}, []);
```

### 3. Gestion améliorée des événements d'authentification

```typescript
// Délai spécifique pour SIGNED_IN
if (event === "SIGNED_IN") {
  setTimeout(() => checkAdminStatus(), 150);
} else {
  checkAdminStatus();
}
```

### 4. Cache sessionStorage avec validation temporelle

```typescript
// Cache avec timestamp
const CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

// Vérification de validité du cache
if (cachedValue && cachedTimestamp) {
  const timestamp = parseInt(cachedTimestamp, 10);
  const isValid = (Date.now() - timestamp) < CACHE_VALIDITY_MS;
  
  if (isValid) {
    return cachedValue === "true";
  } else {
    // Cache expiré, le nettoyer
    sessionStorage.removeItem(SESSION_CACHE_KEY);
    sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
  }
}
```

### 5. Coordination des refresh dans HeaderClient

```typescript
if (event === "SIGNED_IN") {
  // Délai plus long pour SIGNED_IN
  setTimeout(() => router?.refresh(), 200);
} else if (event === "SIGNED_OUT") {
  // Refresh immédiat pour SIGNED_OUT
  setTimeout(() => router?.refresh(), 50);
}
```

## Résultats attendus

1. **Affichage immédiat** : Les liens admin apparaissent dans les 200-300ms après connexion
2. **Robustesse** : Le système retry gère les problèmes de timing temporaires
3. **Performance** : Cache intelligent évite les vérifications inutiles
4. **Fiabilité** : Gestion coordonnée des événements d'authentification

## Tests ajoutés

- Test de retry quand la session n'est pas immédiatement disponible
- Test de retry quand le profil n'est pas trouvé initialement
- Test d'utilisation du cache valide
- Test de nettoyage du cache expiré
- Test de gestion de l'événement SIGNED_IN avec délai

## Fichiers modifiés

- `src/actions/authActions.ts` : Ajout du délai avant redirection
- `src/components/layout/header.tsx` : Système de retry et cache amélioré
- `src/components/layout/header-client.tsx` : Coordination des refresh
- `src/components/layout/__tests__/header-admin-timing.test.tsx` : Tests de non-régression

## Migration

Aucune migration nécessaire. Les changements sont entièrement rétrocompatibles et améliorent uniquement l'expérience utilisateur.