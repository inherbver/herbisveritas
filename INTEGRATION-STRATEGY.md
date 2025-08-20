# Stratégie d'intégration progressive des changements pending

## État actuel

- **Site fonctionnel** avec synchronisation du panier résolue
- **27 fichiers modifiés** dans le stash sauvegardé
- **Problème 404** sur les routes produits dû aux imports de Link

## Changements prioritaires (À intégrer MAINTENANT)

### 1. Fix des imports Link (CRITIQUE)

**Fichiers**: `footer.tsx`, `header-client.tsx`, `mobile-bottom-nav.tsx`
**Changement**: `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"`
**Impact**: Résout les 404 sur toutes les routes localisées
**Risque**: AUCUN - Fix nécessaire

## Changements à analyser avec précaution

### 2. Système d'authentification amélioré

**Fichiers nouveaux**:

- `src/lib/cookies/universal-cookies.ts` - Gestion universelle des cookies
- `src/lib/auth/cookie-bridge.ts` - Bridge entre middleware et components
- `src/lib/auth/server-headers.ts` - Headers pour auth
- `src/lib/auth/token-store.ts` - Store des tokens
- `src/components/auth/client-auth-check.tsx` - Vérification auth côté client

**Fichiers modifiés**:

- `src/utils/authUtils.ts` - Cache et gestion session
- `src/middleware.ts` - Logging détaillé et cookie bridge
- `src/lib/supabase/server.ts` - Logging cookies

**Recommandation**: ATTENDRE - Le système actuel fonctionne, ces améliorations peuvent introduire de la complexité

### 3. Protection CSRF

**Fichiers**: `src/lib/security/csrf-protection.ts`
**Changement**: Await ajouté sur cookies()
**Impact**: Amélioration de sécurité
**Recommandation**: INTÉGRER après tests

### 4. Tests et débogage

**Fichiers nouveaux**:

- `src/app/[locale]/test-auth/` - Pages de test auth
- `src/actions/authSyncAction.ts` - Action de sync auth
- `SOLUTION-SESSION-STABILITY.md` - Documentation des fixes

**Recommandation**: SUPPRIMER - Fichiers de debug non nécessaires en production

### 5. Dépendances

**Fichiers**: `package.json`, `package-lock.json`
**Ajout**: `next-cookies-universal`
**Recommandation**: ANALYSER si vraiment nécessaire

## Plan d'action recommandé

### Phase 1 - Immédiat (Aujourd'hui)

1. ✅ Committer uniquement les fixes Link des 3 fichiers de layout
2. ✅ Tester que les routes produits fonctionnent
3. ✅ Push et déploiement

### Phase 2 - Court terme (Cette semaine)

1. Analyser le système de cookies universels
2. Décider si nécessaire ou si le système actuel suffit
3. Si oui, intégrer progressivement avec tests

### Phase 3 - Moyen terme (Si nécessaire)

1. Intégrer les améliorations d'auth SI problèmes constatés
2. Activer la protection CSRF
3. Nettoyer les fichiers de test

## Fichiers à NE PAS intégrer

- `test-cart-sync.md` - Documentation temporaire
- `src/app/[locale]/test-auth/` - Pages de test
- Tous les fichiers de debug et test

## Commandes pour intégration sélective

```bash
# Pour récupérer uniquement certains fichiers du stash
git checkout stash@{0} -- src/components/layout/footer.tsx
git checkout stash@{0} -- src/components/layout/header-client.tsx
git checkout stash@{0} -- src/components/layout/mobile-bottom-nav.tsx

# Pour voir les différences d'un fichier spécifique
git diff stash@{0} -- path/to/file

# Pour lister les fichiers dans le stash
git stash show --name-only
```

## Conclusion

L'approche progressive minimise les risques. Le site fonctionne bien actuellement, donc chaque changement doit être justifié par un besoin réel plutôt que par une amélioration théorique.
