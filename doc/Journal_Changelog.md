# SUFFERS.md

## Blocages et points "tricky" rencontrés

### 1. Problème d'import avec les alias `@/`
- Next.js (sans config spéciale) ne supporte pas les imports du type `@/src/components/...`.
- Solution : utiliser des chemins relatifs classiques ou configurer `tsconfig.json` + `next.config.js` pour les alias.

### 2. Problèmes de tests avec Jest et Next.js 15
- Les tests unitaires ne s'exécutent pas malgré la bonne détection des fichiers.
- Plusieurs tentatives avec `ts-jest`, `babel-jest`, puis le preset officiel `next/jest`.
- Blocage probablement dû à la compatibilité ESM/CJS, à la structure Next.js App Router ou à un conflit de versions.
- Solution temporaire : mettre les tests de côté et prioriser l'avancement fonctionnel.

### 3. i18n (next-intl) et structure des pages
- Migration de `/app/boutique/page.tsx` vers `/app/[locale]/boutique/page.tsx`.
- Nécessite d'adapter tous les imports et la gestion des locales, et de bien comprendre la gestion du middleware.

### 4. Header : hooks "client only" (usePathname, useLocale, useTranslations)
- Erreur : "You're importing a component that needs `usePathname`. This React hook only works in a client component. To fix, mark the file (ou son parent) avec la directive `"use client"` en haut du fichier.
- Solution : ajouter la directive `"use client"` en haut du fichier concerné (typiquement `src/components/Header.tsx`).

### 5. Port 3000 déjà utilisé
- Next.js démarre automatiquement sur un port libre (ex : 3002) si 3000 est occupé.
- Penser à vérifier l'URL locale dans les logs.

### 6. Composants non exportés et Storybook
- Problème : Plusieurs composants (`ProductSort`, `QuantitySelector`, `Header`, `Footer`, `MainContainer`, `HeroSection`) étaient définis dans leurs fichiers `.tsx` mais sans le mot-clé `export` devant leur définition (`const MonComposant = ...` au lieu de `export const MonComposant = ...`).
- Symptôme : Storybook échoue à afficher les stories de ces composants avec l'erreur "Unable to render story [nom-story] as the component annotation is missing from the default export". L'import `{ MonComposant }` dans le fichier `.stories.tsx` ne fonctionne pas car le composant n'est pas exporté depuis son module.
- Solution : Ajouter le mot-clé `export` devant la définition de chaque composant concerné dans son fichier `.tsx`.

---

**À compléter au fil des blocages et des solutions trouvées !**

---

## Problèmes récents rencontrés et résolus (depuis inherbis/SUFFERS.md)

### 1. Conflit de définition de fonction utilitaire `cn`
- **Erreur** : `the name 'cn' is defined multiple times` dans `src/components/primitives/Button.tsx`.
- **Cause** : La fonction `cn` était à la fois importée de `@/lib/utils` et redéfinie localement.
- **Résolution** : Suppression de la définition locale, conservation uniquement de l'import.

### 2. Problèmes de typage TypeScript sur la page boutique
- **Erreur** : `Cannot find module '@/components/shared/ProductCard' or its corresponding type declarations` et problèmes de typage implicite sur `products`.
- **Cause** : Mauvais export du type `Product` ou mauvais chemin d'import.
- **Résolution** : Vérification de l'export du type `Product` et correction de l'import.

### 3. Problème d'affichage de la landing page
- **Erreur** : La page boutique ne s'affichait pas comme page d'entrée (`/`).
- **Résolution** : Mise en place d'une redirection Next.js (`redirect('/shop')`) dans `src/app/page.tsx`.

### 4. Erreur Next.js : Event handlers cannot be passed to Client Component props
- **Erreur** : `Event handlers cannot be passed to Client Component props.` lors du passage de handlers (onChange, onSubmit...) à des composants enfants marqués "use client".
- **Cause** : La page parent était un composant serveur par défaut, ce qui empêche le passage de fonctions à des composants client dans l'App Router Next.js.
- **Résolution** : Ajout de la directive `"use client"` en haut de `src/app/shop/page.tsx` pour rendre toute la page boutique côté client.

---

## Problèmes potentiels à surveiller (depuis inherbis/SUFFERS.md)

 
- Cache IDE ou Next.js pouvant afficher de fausses erreurs après modification des fichiers.
- Duplication de code entre pages (préférer la redirection ou la factorisation de composants).
- Vérifier l'unicité des définitions utilitaires dans tous les fichiers (éviter les redéfinitions locales).

---

# CHANGELOG.md

# Changelog - InHerbisVeritas

Ce fichier retrace les principaux problèmes rencontrés et les solutions mises en place au cours du développement du projet.

## 2025-04-06 / 2025-04-07

### ὁ Problèmes résolus

#### Composant Button - Prop `asChild`

**Problème** :
- Erreur dans la console : La prop `asChild` était définie dans l'interface `ButtonProps` mais n'était pas correctement gérée dans l'implémentation du composant
- Cette erreur se produisait lorsque `<Button asChild>` était utilisé dans le composant HeroSection
- La prop était transmise directement à l'élément HTML `<button>` natif qui ne reconnaît pas cette propriété

**Solution** :
- Ajout du package `@radix-ui/react-slot` : `npm install @radix-ui/react-slot`
- Modification du composant Button pour utiliser le composant Slot de Radix UI
- Implémentation conditionnelle : si `asChild=true`, utiliser Slot comme élément racine, sinon utiliser l'élément button natif
- Cela permet au Button de transférer ses props (y compris les classes) à son enfant direct quand asChild est activé

**Fichiers modifiés** :
- `src/components/primitives/Button/Button.tsx`

#### Paramètres de route Next.js - Usage asynchrone

**Problème** :
- Erreurs dans la console : 
  ```
  Error: Route "/boutique/[id]" used `params.id`. `params` should be awaited before using its properties.
  ```
- Ces erreurs survenaient dans les fonctions `generateMetadata` et `ProductDetailPage` de la page détails produit
- Dans Next.js 13+ avec App Router, les paramètres de route peuvent provenir de sources asynchrones et doivent être traités comme tels

**Solution** :
- Extraction préalable de l'ID en variable locale avant son utilisation
- Ajout de vérifications d'existence de l'ID
- Ajout de la propriété `metadataBase` pour résoudre l'avertissement sur les images OpenGraph/Twitter

**Fichiers modifiés** :
- `src/app/boutique/[id]/page.tsx`

**Bonne pratique standardisée** :
```tsx
// ✅ Extraction préalable de l'ID en variable locale
export async function generateMetadata({ params }: Props) {
  const id = params?.id;
  if (!id) {
    // Gérer cas d'erreur
  }
  const product = await getProduct(id);
}
```

#### Transfert de fonctions entre Server et Client Components

**Problème** :
- Erreur 500 lors de l'accès à la page Shop
- Causée par la transmission de fonctions de rappel (callbacks) du Server Component (page.tsx) vers des Client Components (ProductGrid, ProductFilters)
- Next.js ne permet pas de sérialiser des fonctions entre Server et Client Components

**Solution** :
- Suppression des callbacks dans les props des composants
- Restructuration pour éviter de passer des fonctions des Server Components aux Client Components
- Préparation future : considérer l'utilisation d'un state manager (comme Zustand) pour gérer les interactions entre ces composants

**Fichiers modifiés** :
- `src/app/boutique/page.tsx`
- `src/components/domain/boutique/ProductGrid/ProductGrid.tsx`
- `src/components/domain/boutique/ProductFilters/ProductFilters.tsx`

### Ὠ Nouvelles fonctionnalités

#### Pages e-commerce principales

**Pages créées** :
- Page Boutique (`/boutique`) : Affichage de l'ensemble des produits avec filtres
- Page Détails Produit (`/boutique/[id]`) : Affichage détaillé d'un produit spécifique

**Composants utilisés** :
- `HeroSection` : Bannière principale avec titre, description et CTA
- `ProductGrid` : Grille de produits adaptative
- `ProductCard` : Carte individuelle pour chaque produit
- `ProductFilters` : Système de filtrage par catégorie, prix, etc.
- `ArticleTag` : Tags pour catégoriser les produits

**Données** :
- Création de mocks de produits pour simuler une base de données
- Simulation d'une fonction `getProduct` qui sera remplacée par des appels API réels

### ὐ Décisions architecturales

#### Séparation Client/Server Components

- Respect strict de la séparation entre Server Components et Client Components selon les recommandations Next.js
- Utilisation de 'use client' uniquement lorsque nécessaire
- Évitement de transmission de fonctions entre Server et Client Components

#### Accessibilité et HTML sémantique

- Utilisation stricte des balises HTML sémantiques (section, article, header, etc.)
- Ajout d'attributs ARIA appropriés pour une meilleure expérience avec les lecteurs d'écran
- Évitement des imbrications profondes de div pour simplifier la structure du DOM

#### Pattern pour les composants UI

- Utilisation du pattern Polymorphic Component avec `asChild` pour les composants de base comme Button
- Adoption des patterns de ShadCN UI pour la cohérence visuelle et fonctionnelle

### Ὅ Notes pour le développement futur

1. **Gestion d'état** :
   - Implémenter Zustand pour la gestion globale de l'état
   - Créer des stores séparés pour le panier, l'utilisateur, les filtres, etc.

2. **Interaction avec le backend** :
   - Centraliser les mocks de données dans un dossier dédié
   - Créer un service pattern pour simuler puis implémenter les appels API

3. **Prochaines user stories à implémenter** :
   - Système de panier fonctionnel
   - Pages checkout et confirmation
   - Authentification utilisateur

4. **Optimisations** :
   - Mise en cache des données avec SWR ou React Query
   - Implémentation du chargement progressif des images
   - Optimisation des métadonnées pour le SEO

