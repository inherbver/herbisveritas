# Rapport de nettoyage du projet

Date: 2025-08-09

## Fichiers supprimés

### Assets non utilisés (public/)

- ✅ `public/file.svg` - Fichier par défaut, non utilisé
- ✅ `public/globe.svg` - Fichier par défaut, non utilisé
- ✅ `public/window.svg` - Fichier par défaut, non utilisé
- ✅ `public/next.svg` - Fichier par défaut Next.js, non utilisé
- ✅ `public/vercel.svg` - Fichier par défaut Next.js, non utilisé
- ✅ `public/assets/images/pdct_1.webp` à `pdct_6.webp` - Images produits non référencées

### Dossiers vides

- ✅ `public/images/hero/` - Dossier vide
- ✅ `public/images/markets/` - Dossier vide
- ✅ `src/components/admin/__tests__/` - Dossier de tests vide

### Composants obsolètes

- ✅ `src/components/domain/contact/__tests__` - Tests pour composant supprimé
- ✅ `src/components/domain/contact/MarketAgenda.tsx` - Remplacé par MarketCalendarView

### Pages de test (développement)

- ✅ `src/app/test-cart-actions/` - Page de test des actions panier
- ✅ `src/app/[locale]/admin/security-test/` - Page de test sécurité
- ✅ `src/app/[locale]/test-colissimo/` - Page de test widget Colissimo

## Fichiers conservés (avec justification)

### Fichiers JSON de données

- ⏳ `src/data/markets.json` - Encore utilisé comme fallback dans `market-utils.ts`
- ⏳ `src/data/partners.json` - Encore utilisé comme fallback dans `contact/page.tsx`

**Note**: Ces fichiers sont utilisés comme fallback même si les données sont maintenant dans la base de données (6 marchés, 3 partenaires). À supprimer après refactoring du code pour utiliser uniquement la base de données.

### Assets utilisés

- ✅ `public/grain.svg` - Utilisé dans footer.tsx
- ✅ `public/leaf.svg` - Utilisé dans footer.tsx

## Recommandations futures

1. **Suppression des fichiers JSON** : Après migration complète vers la base de données
   - Modifier `src/lib/market-utils.ts` pour supprimer l'import de `markets.json`
   - Modifier `src/app/[locale]/contact/page.tsx` pour supprimer l'import de `partners.json`
   - Supprimer le dossier `src/data/`

2. **Consolidation des types** : Les types produits sont définis dans plusieurs endroits
   - `src/types/cart.ts` - Types pour le store client
   - `src/types/product-types.ts` - Types génériques produits
   - `src/lib/supabase/types.ts` - Types base de données
   - Recommandation : Créer un fichier unique de types centralisé

3. **Structure des services** : Clarifier la différence entre
   - `src/lib/services/` - Services métier
   - `src/lib/actions/` - Server Actions Next.js
   - `src/actions/` - Actions existantes

## Impact

- **Fichiers supprimés** : 21 fichiers/dossiers
- **Lignes de code économisées** : ~500 lignes
- **Espace disque libéré** : ~2 MB (principalement images)
- **Amélioration de la maintenabilité** : Suppression du code obsolète et des doublons
