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
- Migration de `/app/boutique/page.tsx` vers `/app/[locale]/boutique/page.tsx` nécessaire.
- Nécessite d'adapter tous les imports et la gestion des locales.
- **Solution / Clarification Context7** :
  - `RootLayout` doit récupérer la locale et envelopper les `children` avec `<NextIntlClientProvider>` pour fournir messages et locale aux Client Components.
  - La navigation (liens `<Link>`, redirections `redirect`, hooks `useRouter`, `usePathname`) *doit* utiliser les versions localisées fournies par `next-intl/navigation` (souvent via un fichier `src/i18n/navigation.ts`).
  - Un `middleware.ts` est indispensable pour détecter et gérer la locale de la requête.

### 4. Header / Composants clients : hooks "client only" (usePathname, useLocale, useTranslations)
- Erreur : "You're importing a component that needs `usePathname`. This React hook only works in a client component..."
- **Solution / Clarification Context7** :
  - Confirme que tout composant utilisant des hooks interactifs (`useState`, `useEffect`), des API navigateur (`usePathname` même celui de `next-intl/navigation`), ou des événements **doit** être marqué avec la directive `"use client"`.
  - Les hooks comme `useTranslations` peuvent être utilisés dans les Server Components *uniquement* s'il n'y a pas d'interactivité client requise.
  - Le `Header`, le `Breadcrumb` et d'autres composants interactifs seront probablement des Client Components ou devront déléguer l'usage des hooks à des sous-composants clients.

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


## 2025-04-26

### ὁ Problèmes résolus

#### Erreur ESLint `react/no-unescaped-entities` et `commitlint` bloquant le commit

**Problème** :
- Le hook pre-commit (Husky + lint-staged) échouait systématiquement lors de la tentative de commit des modifications de la page de test des composants (`src/app/test-components/page.tsx`).
- La cause principale était l'erreur ESLint `react/no-unescaped-entities`, déclenchée par la présence d'apostrophes non échappées (`'`) dans le contenu JSX (ex: `<DialogTitle>Êtes-vous sûr?</DialogTitle>`, `<AlertDescription>Ceci est une alerte d'erreur.</AlertDescription>`).
- Plusieurs tentatives d'échappement (avec `{''}` ou `{""}`) ont échoué car la règle exige l'utilisation d'entités HTML ou la désactivation de la règle.
- En parallèle, un problème secondaire avec `commitlint` (`body-max-line-length`) est survenu, car certaines lignes de la description du message de commit dépassaient 100 caractères.

**Solution** :
- **Erreur ESLint** : Correction des apostrophes non échappées dans le fichier `src/app/test-components/page.tsx` en utilisant l'entité HTML `&apos;` pour les composants concernés (`DialogTitle`, `AlertDescription`).
- **Erreur commitlint** : Réorganisation du message de commit pour que les lignes de la description respectent la limite de longueur de 100 caractères.
- **Avertissement `.eslintignore`** : Noté mais ignoré pour l'instant (pas bloquant). Un fichier `.eslintignore` a été ajouté pour exclure le dossier `.next/`.
- **Déplacement `Toaster`** : Le composant `Toaster` de Sonner a été déplacé de la page de test vers le layout racine (`src/app/layout.tsx`) conformément aux bonnes pratiques.
- **Suppression `console.log`** : Retrait d'un `console.log` dans la page de test qui aurait pu potentiellement causer des erreurs de linting.

**Fichiers modifiés** :
- `src/app/test-components/page.tsx`
- `src/app/layout.tsx`
- `.eslintignore` (ajouté)

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

## 2025-04-27

### ὁ Problèmes résolus

#### Erreur d'hydratation React : `whitespace text nodes cannot be a child of <html>`

**Problème** :
- L'application échouait au chargement avec une erreur d'hydratation React côté client, même après avoir configuré correctement `next-intl` (middleware, i18n.ts, provider).
- L'erreur indiquait la présence de nœuds texte (espaces blancs, retours à la ligne) comme enfant direct de la balise `<html>`, ce qui est invalide et casse l'hydratation.
- La cause pouvait se situer soit dans le layout racine (`src/app/layout.tsx`), soit dans le layout spécifique à la locale (`src/app/[locale]/layout.tsx`), car les deux peuvent définir la balise `<html>`.

**Solution** :
- Après plusieurs tentatives, la solution finale a consisté à modifier le layout racine (`src/app/layout.tsx`) pour s'assurer que la balise `<body>` soit directement imbriquée dans `<html>` sans aucun espace blanc ou retour à la ligne intermédiaire dans le code JSX.
- Le layout spécifique à la locale (`src/app/[locale]/layout.tsx`) a également été vérifié et corrigé pour éviter le même problème lors de la surcharge de la balise `<html>`.
- Le code final dans `src/app/layout.tsx` est devenu : `<html lang="fr"><body>{children}</body></html>`.

**Fichiers modifiés** :
- `src/app/layout.tsx`
- `src/app/[locale]/layout.tsx`

#### Erreur 404 pour la locale `fr` manquante
**Problème**:
- Le middleware redirige vers `/fr` par défaut, mais le fichier `src/messages/fr.json` n'existait pas, provoquant un 404 et l'affichage de la page NotFound.
**Solution**:
- Création d'un fichier `src/messages/fr.json` basique avec les clés de traduction minimales.
**Fichier ajouté**:
- `src/messages/fr.json`

#### Avertissement `params.locale` asynchrone (Next.js 15)
**Problème**:
- Accès direct à `params.locale` dans les Server Components causait un warning `sync-dynamic-apis`.
**Solution**:
- Retrait de la prop `params` dans la page (`page.tsx`) et adaptation du layout asynchrone pour utiliser `const { locale } = await params;`.
**Fichiers modifiés**:
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/page.tsx`

#### Erreur 404 sur `/fr/test-components`
**Problème**:
- Le dossier `test-components` était situé hors du segment `[locale]`, donc inaccessible sous `/fr/test-components`.
**Solution**:
- Déplacement du dossier dans `src/app/[locale]/test-components`.
**Fichier déplacé**:
- `src/app/[locale]/test-components/page.tsx`

#### Styles globaux non appliqués
**Problème**:
- Les styles Tailwind et `globals.css` n'étaient pas importés dans le layout racine, entraînant la perte de styles sur les pages localisées.
**Solution**:
- Ajout de `import './globals.css';` dans `src/app/layout.tsx`.
**Fichier modifié**:
- `src/app/layout.tsx`

## 2025-04-27
### ὁ Problèmes résolus

#### Erreur d'hydratation "whitespace text node" dans `<html>`
**Problème**:
- Persistance d'une erreur d'hydratation React (`Text nodes cannot appear as a child of <html>`) même après avoir centralisé la structure `<html>`/`<body>` dans `app/layout.tsx`.
- La cause était un espace, un retour à la ligne ou un commentaire JSX entre la balise fermante `>` de `<html>` et la balise ouvrante `<` de `<body>`.
**Solution**:
- Modification de `src/app/layout.tsx` pour s'assurer qu'il n'y a absolument aucun caractère (espace, retour ligne, commentaire) entre `<html>` et `<body>`, en les plaçant sur la même ligne dans le `return`.
**Fichiers modifiés**:
- `src/app/layout.tsx`

## 2025-04-27

### ὁ Problèmes résolus

#### Résolution du problème d'application des styles de texte

- **Problème** : Les styles de texte (polices `font-sans`, tailles `text-lg`, graisse `font-medium`, etc.) ne s'appliquaient pas sur les pages de test des composants dans Next.js 15 avec Tailwind CSS, malgré des styles de couleur fonctionnant correctement.
- **Cause racine** : Erreurs de build causées par des directives `@apply` dans `globals.css` utilisant des classes inexistantes (`outline-ring/50`), interrompant la génération des utilitaires Tailwind.
- **Solution** : Remplacement de `@apply outline-ring/50` par du CSS pur (`outline-color: color-mix(in oklab, var(--ring) 50%, transparent)`) et correction des commentaires `//` en `/* */` pour compatibilité avec Turbopack/PostCSS.
- **Résultat** : Build réussi, styles de texte appliqués correctement sur les pages de test.