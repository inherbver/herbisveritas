# ARCHITECTURE.md

# ARCHITECTURE.md

# ARCHITECTURE.md — E-commerce Next.js

Ce document présente la structure technique, les patterns, et les bonnes pratiques pour garantir un projet scalable, sécurisé et maintenable.

---

## Stack technique
- Next.js 15+ (App Router, Server Components)
- React 18.2+, TypeScript 5.x
- Supabase-js 2.x (auth, DB, RLS)
- Zustand 4.x, React Hook Form + Zod
- Tailwind CSS 3.x / **shadcn/ui (Base par défaut pour les composants UI)**
- Framer Motion (pour les animations et transitions)
- next-intl (i18n Fr/En/De/Es)

---

## Organisation des dossiers

```
app/
  (routes publiques : boutique/, panier/, etc.)
  admin/ (routes protégées)
src/
  components/ (primitives/ shared/ layout/ domain/)
  domains/ (logique métier spécifique, ex: src/domains/cart/)
  lib/ (utilitaires, hooks, config Supabase/Zustand)
  locales/ (fichiers i18n)
  styles/ (global.css, tailwind.config)
content/ (contenu statique Markdown)
public/ (assets statiques)
```

---

## Liens utiles
- [README.md](./README.md) — Vue d’ensemble, installation, schéma DB détaillé
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — UI, tokens, accessibilité
- [TESTING.md](./TESTING.md) — Stratégie de test
- [SECURITY.md](./SECURITY.md) — Sécurité

---

## Base de données & ORM
- **Supabase** est utilisé pour l'authentification, la base de données PostgreSQL et la sécurité Row Level Security (RLS).
- Les opérations se font via `supabase-js` côté client/serveur et SQL natif pour les migrations/fonctions.
- **Schéma principal (MVP)** : `profiles` (users), `products`, `carts`/`cart_items`, `orders`/`order_items`, `addresses`. (Détails dans `README.md`)
- **Prisma** n'est **pas** utilisé pour le MVP mais l'architecture SQL reste compatible pour une migration future.

---

## Patterns & bonnes pratiques

- **Server Components par défaut** : Utiliser les Server Components pour le rendu initial, l'accès direct aux données et la sécurité. Opter pour les Client Components (`"use client"`) uniquement pour l'interactivité (`useState`, `useEffect`, événements).
- **Utilisation de shadcn/ui comme fondation UI** : Tous les nouveaux composants doivent prioritairement s'appuyer sur les primitives et composants fournis par `shadcn/ui` (installés via `npx shadcn-ui@latest add ...`) pour garantir la cohérence, l'accessibilité et la maintenabilité. Voir `DESIGN_SYSTEM.md`.
- **Gestion d'état global (Zustand)** :
    - Choisi pour sa simplicité, sa légèreté et son API basée sur les hooks.
    - Idéal pour gérer des états transversaux comme le panier (`cartStore`) sans prop drilling excessif ni complexité de Redux.
    - **Pratique recommandée :** Créer des stores dédiés par domaine métier (ex: `src/lib/stores/cartStore.ts`, `src/lib/stores/userStore.ts`) pour une meilleure organisation.
- **Validation (Zod)** : Utiliser Zod avec React Hook Form pour une validation robuste des formulaires côté client et serveur.

- **Internationalisation (i18n)** : `next-intl` pour gérer les traductions (fr/en/de/es) avec fallback. Fichiers dans `src/locales/`.
- **Stratégie de Fetching de Données :**
    - **Chargement initial (Server Components) :** Privilégier le fetch de données directement dans les Server Components (`async` / `await`) pour le rendu initial côté serveur.
    - **Mutations (Server Actions) :** Utiliser les Server Actions pour les opérations d'écriture (soumission de formulaires, ajout au panier, etc.) pour une intégration fluide avec React sans API routes manuelles.
    - **Fetching Côté Client (Client Components) :** Si un re-fetching ou un chargement côté client est nécessaire (ex: pagination interactive, données temps réel), utiliser des hooks (`useEffect` + `fetch`, SWR, TanStack Query) dans les Client Components (`"use client";`).
- **Sécurité (Défense en profondeur)** :
    - Middleware Next.js pour protéger les routes (ex: `/admin`, `/profil`).
    - Vérifications côté serveur dans les API routes / Server Actions.
    - Row Level Security (RLS) dans Supabase pour contrôler l'accès aux données au niveau de la base.
    - Validation Zod systématique des entrées.
    - Pas de clés secrètes exposées côté client.
- **Checkout hybride (guest/user)** : Permettre la commande en invité ou connecté, avec option de création de compte post-achat.
- **Accessibilité & SEO** : Intégrés dès la conception (balises sémantiques, attributs ARIA, meta tags, microdata). Checklist par composant/page.
- **Tests automatisés** : Stratégie multi-niveaux (unitaire, intégration, E2E) détaillée dans `TESTING.md`.
- **Animations (Framer Motion)** : Utiliser Framer Motion pour créer des animations et transitions significatives qui améliorent l'expérience utilisateur (feedback, guidage visuel) sans nuire aux performances. Voir `DESIGN_SYSTEM.md` pour les principes.

---

## Thème & Design System (basé sur shadcn/ui)
- Centralisation des couleurs, typographies et espacements via `tailwind.config.js` (tokens), configurés pour `shadcn/ui`.
- Utilisation de `shadcn/ui` pour les primitives UI accessibles et stylisables.
- Composants organisés en `primitives` (atomes), `shared` (molécules), `layout`, et `domain` (spécifiques métier). Voir `DESIGN_SYSTEM.md`.

---

## Bonnes pratiques de rendu Next.js (App Router)

L'App Router de Next.js introduit un modèle hybride puissant basé sur les React Server Components (RSC). Comprendre la distinction et la composition des Composants Serveur et Client est crucial pour la performance, la maintenabilité et pour éviter des erreurs courantes.

### Composants Serveur (Server Components - Par défaut)

- **Quoi ?** Composants exécutés **uniquement** sur le serveur. Ils n'ont pas d'état React (`useState`) ni d'accès aux API navigateur (`window`, `localStorage`). Ils peuvent être `async`.
- **Quand les utiliser ?**
    - Pour accéder directement aux sources de données (bases de données, API internes).
    - Pour garder du code sensible côté serveur (clés API, logique métier privée).
    - Pour réduire la quantité de JavaScript envoyée au client (meilleure performance initiale).
    - Pour le rendu statique (SSG) ou dynamique (SSR) des parties non interactives de l'UI.
- **Stratégies de rendu :**
    - **Statique (par défaut) :** Rendu au moment du build ou après revalidation. Rapide, cacheable via CDN. Idéal pour contenu non personnalisé (blog, pages produit).
    - **Dynamique :** Rendu à chaque requête. Nécessaire si le contenu dépend de l'utilisateur (cookies), des paramètres de recherche (`searchParams`), ou si des API dynamiques (`headers()`, `cookies()`) sont utilisées.
    - **Streaming :** Permet d'envoyer l'UI par morceaux (`Suspense`), améliorant le LCP perçu.

### Gestion des API Dynamiques Asynchrones (Next.js 15+)

- **Le changement :** Les props `params`, `searchParams` et les fonctions `cookies()`, `headers()` (de `next/headers`) sont désormais **asynchrones**. L'accès synchrone direct (ex: `searchParams.category`) est déprécié et causera des erreurs.
- **Dans les Composants Serveur (async) :** Il faut **`await`** l'objet avant d'accéder à ses propriétés.
  ```jsx
  // Exemple dans une page serveur
  export default async function Page({ searchParams }) {
    const awaitedSearchParams = await searchParams; // Attendre l'objet
    const category = awaitedSearchParams.category; // Accéder à la propriété
    // ...
  }
  ```
- **Dans les Composants Client (`'use client'`) :** Si vous passez ces props (qui sont des promesses) à un composant client, utilisez **`React.use()`** pour lire la valeur résolue.
  ```jsx
  // Exemple dans un composant client
  'use client';
  import { use } from 'react';

  function ClientComponent({ searchParamsPromise }) {
    const searchParams = use(searchParamsPromise); // Lire la promesse
    const category = searchParams.category;
    // ...

  }
  ```
- **Conséquence :** Cela rend l'accès aux données de la requête plus explicite quant à son caractère potentiellement dynamique et asynchrone. Les `codemods` peuvent aider à la migration (`npx @next/codemod@canary next-async-request-api .`).

### Composants Client (Client Components - Opt-in)

- **Quoi ?** Composants qui s'exécutent (après hydratation) côté client. Ils sont déclarés avec la directive `"use client";` en haut du fichier.
- **Quand les utiliser ?**
    - **Interactivité :** Pour utiliser les hooks `useState`, `useEffect`, `useReducer`, etc.
    - **Gestionnaires d'événements :** Pour répondre aux interactions utilisateur (`onClick`, `onChange`, etc.).
    - **APIs Navigateur :** Pour accéder à `window`, `localStorage`, `geolocation`, etc.
- **Important :** Dès qu'un fichier contient `"use client";`, tous les modules qu'il importe (y compris les composants enfants) deviennent partie intégrante du bundle JavaScript client.

### Modèles de Composition & Bonnes Pratiques

1.  **Pousser les Composants Client vers les feuilles :**
    - **Objectif :** Minimiser la taille du bundle JS client.
    - **Comment :** Gardez vos layouts, pages et composants structurels en tant que Composants Serveur autant que possible. Extrayez uniquement les parties *interactives* dans des Composants Client dédiés.
    - **Exemple :** Un layout (Serveur) contient un logo (Serveur) et une barre de recherche (Client).

2.  **Passer des Composants Serveur en Props (`children`) aux Composants Client :**
    - **Le problème :** On ne peut **pas** `import` un Composant Serveur *dans* un fichier Composant Client (`"use client";`).
    - **La solution :** Le Composant Serveur parent importe le Composant Client *et* le Composant Serveur "enfant". Il passe ensuite le Composant Serveur comme prop (souvent `children`) au Composant Client.
    - **Avantage :** Le Composant Serveur est rendu sur le serveur, et le Composant Client s'hydrate ensuite autour du résultat. Cela découple les rendus.

    ```jsx
    // Parent (Server Component - e.g., page.tsx)
    import ClientComponent from './ClientComponent';
    import ServerChild from './ServerChild';

    export default function Page() {
      return (
        <ClientComponent>
          <ServerChild /> {/* ServerChild est rendu sur le serveur */}
        </ClientComponent>
      );
    }

    // ClientComponent.tsx
    'use client';
    import { useState } from 'react';

    export default function ClientComponent({ children }) {
      const [count, setCount] = useState(0);
      return (
        <>
          <button onClick={() => setCount(c => c + 1)}>{count}</button>
          {/* 'children' contient le HTML pré-rendu de ServerChild */}
          {children}
        </>
      );
    }
    ```

3.  **Sérialisation des Props :**
    - Les props passées d'un Composant Serveur à un Composant Client doivent être **sérialisables** (pas de fonctions, de Dates, de `Map`, `Set`, etc.).
    - **Erreur fréquente :** Passer une fonction (ex: `onClick={myServerFunction}`) d'un Composant Serveur à un Composant Client est **interdit** et lèvera une erreur. Les gestionnaires d'événements appartiennent aux Composants Client. *(Note: Passer des promesses pour les API dynamiques semble être une exception, gérée via `React.use` côté client).*

En suivant ces principes, on peut tirer parti de la puissance des Composants Serveur pour la performance tout en gardant l'interactivité nécessaire avec les Composants Client, tout en évitant les erreurs de composition courantes.

---

## Ὠ Améliorations simples recommandées (pour un MVP solide)

- **Storybook** : Ajoute Storybook pour documenter et tester les composants UI sans surcoût de dev.
- **Types Supabase automatiques** : Génère les types TypeScript à partir du schéma Supabase (`supabase gen types typescript`).
- **Checklist accessibilité & SEO** : Utilise une checklist rapide à chaque composant/page (balises sémantiques, meta tags, navigation clavier).
- **Dossier `src/domains/`** : Prépare ce dossier pour séparer la logique métier par domaine (produits, users, commandes), même si tu ne l'utilises pas tout de suite.
- **Script d'onboarding** : Fournis un script ou guide pour le setup local (prérequis, commandes clés, accès Supabase).
- **Observabilité future** : Prévois une structure ou variables d'env pour intégrer Sentry, PostHog, Analytics plus tard, sans les activer.

Ces améliorations sont faciles à mettre en place et renforcent la qualité, sans complexifier le développement du MVP.
- Surcharge et dark mode natif prévus

## Gestion des environnements
- Trois environnements distincts :
  - **Dev** : local, pour développement et tests
  - **Test/CI** : pour exécuter les tests automatisés et valider les features avant mise en prod
  - **Prod** : environnement final, sécurisé, performant
- Cette séparation est indispensable pour garantir la qualité, la sécurité, et éviter de casser la production lors de l'ajout de nouvelles fonctionnalités

## Outillage
- CI/CD : GitHub Actions (lint, build, tests, déploiement)
- Tests : Jest, React Testing Library, Playwright/Cypress
- Déploiement : Vercel (front), Supabase (backend)

# DESIGN_SYSTEM.md

# DESIGN_SYSTEM.md — E-commerce Next.js

Ce document définit le design system, les conventions de composants, les bonnes pratiques UI/UX, l’accessibilité, l’organisation des dossiers et l’internationalisation.

---

## Principes
- Design system modulaire, accessible, évolutif
- Atomic design (primitives, shared, layout, domain)
- Cohérence visuelle (tokens, couleurs, typographies, dark mode natif)
- **Fondation sur shadcn/ui** et Tailwind CSS : Utilisation systématique comme base pour les composants UI.
- Centralisation des tokens (couleurs, tailles, espacements) dans `tailwind.config.js` ou CSS vars
- Respect des balises HTML sémantiques
- Responsive et dark mode natif

---

## Organisation des composants
```
src/
└── components/
    ├── ui/           # **Composants shadcn/ui ajoutés via CLI** (ex: Button, Input, Card...)
    ├── primitives/   # Atomes UI maison (si non couverts par shadcn/ui)
    ├── shared/       # Composants transverses (ImageGallery, Newsletter...)
    ├── layout/       # Structure globale (Header, Footer...)
    └── domain/       # Spécifiques métier (ProductCard, CartItem...)
```
- **Workflow shadcn/ui** :
    - Les composants `shadcn/ui` **doivent être ajoutés** via la commande `npx shadcn-ui@latest add [component-name]`.
    - Ils sont placés dans `src/components/ui` (configurable via `components.json`) et deviennent partie intégrante du projet (copie du code source).
    - Consulter la liste et la documentation de chaque composant ici : [https://ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components)
    - Les composants personnalisés (`primitives`, `shared`, `domain`) doivent **s'appuyer sur / composer** les composants `shadcn/ui` autant que possible. Ne réinventer que si nécessaire.
- Tous les composants sont centralisés dans `src/components/` (sauf exceptions documentées)
- Documenter chaque composant (usage, props, accessibilité, variantes)
- Prévoir la surcharge des styles via tokens
- Anticiper l’intégration de nouveaux rôles, i18n, analytics

---

## Bonnes pratiques
- Mobile-first : tous les composants sont responsive et testés sur mobile et desktop
- Accessibilité : focus visible, aria-labels, navigation clavier, couleurs contrastées
- SEO : balises sémantiques, attributs alt, microdata/schema.org, lazy loading images
- Design system : tokens centralisés, variantes, dark mode natif
- Tests : unitaires, accessibilité, flows critiques Playwright/Cypress
- Exports nommés uniquement, PascalCase, documentation JSDoc/Storybook
- Préparation i18n Fr/En : tous les textes via système de traduction (next-intl), props dynamiques, structure des fichiers de traduction dès la conception
- Optimisation : lazy loading, skeletons, composants adaptatifs, hooks custom (useCart, useProduct, etc.)
- Compatibilité future Prisma : la structure des composants et des accès DB reste compatible avec une éventuelle intégration de Prisma

---

## Accessibilité
- Checklist à chaque composant/page (balises sémantiques, contrastes, navigation clavier, ARIA)
- Tests d’accessibilité automatisés (axe, Testing Library)
- Tests axe/lighthouse réguliers
- Documentation des patterns UI

---

## Internationalisation (i18n)
- Préparation Fr/En dès la structure via next-intl, fichiers de traduction, props dynamiques

---

## Animations & Transitions
- **Bibliothèque :** Framer Motion est utilisé pour toutes les animations et transitions complexes.
- **Principes :**
    - **Subtilité :** Les animations doivent être fluides et discrètes, améliorant l'UX sans distraire.
    - **Performance :** Privilégier les animations sur les propriétés `transform` et `opacity`. Tester l'impact sur les performances.
    - **Signification :** Utiliser les animations pour fournir du feedback (ex: clic sur un bouton), guider l'attention (ex: apparition d'une modale), ou fluidifier les transitions entre états ou pages.
    - **Cohérence :** Définir des durées et des courbes d'animation (easings) cohérentes à travers l'application.
    - **Accessibilité :** S'assurer que les animations ne nuisent pas à l'accessibilité (`prefers-reduced-motion`). Framer Motion offre des facilités pour cela.

---

## Catalogue des Composants

Voici une liste non exhaustive des composants personnalisés présents dans `src/components/`, classés par type et domaine d'utilisation principal.

### 1. Primitives (`src/components/primitives` et `src/components/ui`)

Ces composants sont les briques de base de l'UI. Ils doivent prioritairement provenir de `shadcn/ui` (installés dans `src/components/ui`). Des primitives spécifiques peuvent exister dans `src/components/primitives` si `shadcn/ui` ne couvre pas le besoin.

*   **Exemples typiques (via shadcn/ui):** `Button`, `Input`, `Label`, `Select`, `Checkbox`, `RadioGroup`, `Card`, `Dialog`, `Sheet`, `Tooltip`, `Avatar`, `Badge`, `Separator`, `Skeleton`, `Table`, `Tabs`, `Accordion`, `Carousel`...

### 2. Layout (`src/components/layout`)

Composants responsables de la structure et de l'agencement des pages.

*   `Header`: En-tête principal du site (public).
*   `Footer`: Pied de page principal du site (public).
*   `Sidebar`: Barre latérale (potentiellement pour navigation ou filtres).
*   `MobileNav`: Menu de navigation pour les écrans mobiles.
*   `Container`: Conteneur pour centrer et limiter la largeur du contenu.
*   `Grid`: Système de grille responsive.
*   `Section`: Bloc de contenu standard d'une page.
*   `PageHeader`: En-tête spécifique à une section/page.
*   `AdminLayout`: Structure de page pour l'interface d'administration.
*   `Modal`: Fenêtre modale générique (peut-être remplacée par `Dialog` de shadcn/ui).

### 3. Shared (`src/components/shared`)

Composants réutilisables à travers différents domaines de l'application.

*   `ProductCard`: Carte d'affichage d'un produit (utilisée dans les grilles Boutique, recommandations...).
*   `ArticleCard`: Carte d'affichage d'un article de blog/magazine.
*   `EventCard`: Carte d'affichage d'un événement.
*   `Pagination`: Contrôles de navigation entre les pages de listes.
*   `ImageGallery`: Galerie d'images (utilisée pour les produits, articles...).
*   `NewsletterForm`: Formulaire d'inscription à la newsletter.
*   `SearchBar`: Barre de recherche globale.
*   `UserAvatar`: Affichage de l'avatar utilisateur (souvent lié au profil/compte).
*   `ThemeToggle`: Bouton pour changer de thème (light/dark).
*   `LanguageSwitcher`: Sélecteur de langue.

### 4. Domain (`src/components/domain`)

Composants spécifiques à une fonctionnalité métier ou une section majeure du site.

*   **Boutique:**
    *   `ProductGrid`: Grille affichant plusieurs `ProductCard`.
    *   `ProductDetails`: Section affichant les informations complètes d'un produit.
    *   `ProductGallery`: Utilise probablement `ImageGallery` pour les images produit.
    *   `ProductSpecifications`: Affichage des caractéristiques techniques.
    *   `ProductComposition`: Affichage de la composition.
    *   `RelatedProducts`: Section affichant des produits similaires.
    *   `ProductFilters`: Interface de filtrage des produits (catégories, prix...). utilises potentiellement `Checkbox`, `Slider`, `Select`.
*   **Panier & Checkout:**
    *   `Cart`: Vue complète du panier (probablement dans un `Sheet` ou `Dialog`).
    *   `CartItem`: Affichage d'un article dans le panier.
    *   `CartSummary`: Résumé du panier (total, sous-total).
    *   `ShippingForm`: Formulaire pour l'adresse de livraison.
    *   `PaymentForm`: Formulaire pour les informations de paiement.
    *   `OrderSummary`: Récapitulatif avant validation de la commande.
    *   `OrderConfirmation`: Message/page de confirmation après commande.
*   **Magazine/Blog:**
    *   `ArticleGrid`: Grille affichant plusieurs `ArticleCard`.
    *   `ArticleContent`: Affichage du contenu formaté d'un article.
    *   `ArticleHeader`: En-tête spécifique d'un article.
    *   `ArticleTags`: Affichage des tags/catégories d'un article.
    *   `RelatedArticles`: Section affichant des articles similaires.
*   **Événements:**
    *   `EventList`: Liste affichant plusieurs `EventCard`.
    *   `EventDetails`: Affichage des informations complètes d'un événement.
    *   `EventCalendar`: Vue calendrier des événements.
    *   `EventRegistration`: Formulaire d'inscription à un événement.
*   **Profil Utilisateur:**
    *   `UserProfile`: Affichage/modification des informations du profil.
    *   `OrderHistory`: Liste des commandes passées (utilise `Table`).
    *   `AddressBook`: Gestion des adresses de livraison enregistrées.
    *   `Wishlist`: Gestion de la liste de souhaits.
*   **Admin:**
    *   `Dashboard`: Tableau de bord principal de l'admin.
    *   `UserManagement`: Interface de gestion des utilisateurs (utilise `Table`, `Dialog`...).
    *   `OrderManagement`: Interface de gestion des commandes.
    *   `ProductEditor`: Formulaire d'ajout/modification de produit.
    *   `ArticleEditor`: Éditeur de contenu pour les articles (peut intégrer un WYSIWYG).
    *   `EventEditor`: Formulaire d'ajout/modification d'événement.
    *   `ContentEditor`: Éditeur pour les pages statiques (CGU, etc.).
    *   `SettingsPanel`: Panneau de configuration générale du site.
    *   `Analytics`: Affichage des statistiques (si implémenté).

---

Ce référentiel doit être suivi pour toute création ou refonte de composant. Il garantit la cohérence, la qualité, la maintenabilité et l’évolutivité du design system.

# STRUCTURE_PAGES.md

# STRUCTURE_PAGES.md

Ce document décrit la structure des pages principales de l'application InHerbisVeritas, leur accès (public ou protégé) et les flux de navigation clés prévus pour le MVP.

---

## Sitemap / Liste des Pages Principales

### Pages Publiques (Navigation Principale)

- **`/boutique`**
  - **Description :** Page d'accueil par défaut. Affiche la liste des produits disponibles. Permet le filtrage et le tri.
  - **Accès :** Public
- **`/magazine`**
  - **Description :** Section éditoriale (articles de blog, conseils).
  - **Accès :** Public
- **`/evenements`**
  - **Description :** Liste des événements à venir (ateliers, portes ouvertes...). 
  - **Accès :** Public
- **`/contact`**
  - **Description :** Formulaire de contact et informations (adresse, téléphone).
  - **Accès :** Public

### Pages Publiques (Processus d'Achat)

- **`/boutique/[slug]`**
  - **Description :** Page de détail d'un produit spécifique.
  - **Accès :** Public
- **`/panier`**
  - **Description :** Affiche le contenu du panier, permet de modifier les quantités et de passer à la commande.
  - **Accès :** Public
- **`/commande`**
  - **Description :** Première étape du checkout. Collecte des informations client (adresse de livraison/facturation) pour invités ou utilisateurs connectés.
  - **Accès :** Public
- **`/commande/paiement`**
  - **Description :** Deuxième étape du checkout. Sélection du mode de paiement et récapitulatif avant paiement.
  - **Accès :** Public
- **`/commande/confirmation/[orderId]`**
  - **Description :** Page affichée après un paiement réussi. Confirme la commande et affiche un récapitulatif.
  - **Accès :** Public (accessible via un ID unique, potentiellement lié à la session)

### Authentification

- **`/login`**
  - **Description :** Formulaire de connexion pour les utilisateurs existants.
  - **Accès :** Public
- **`/register`**
  - **Description :** Formulaire d'inscription pour les nouveaux utilisateurs.
  - **Accès :** Public

### Espace Utilisateur (Connecté)

- **`/profil`**
  - **Description :** Tableau de bord de l'utilisateur. Affiche les informations personnelles de base et des liens vers les autres sections du compte.
  - **Accès :** Protégé (nécessite connexion)
- **`/profil/commandes`**
  - **Description :** Liste l'historique des commandes passées par l'utilisateur.
  - **Accès :** Protégé
- **`/profil/commandes/[id]`**
  - **Description :** Affiche les détails d'une commande spécifique de l'historique.
  - **Accès :** Protégé

- **`/profil/adresses`**
  - **Description :** Permet à l'utilisateur de gérer ses adresses de livraison et de facturation enregistrées.
  - **Accès :** Protégé

### Administration (Protégé)

- **`/admin`**
  - **Description :** Tableau de bord principal de l'administration.
  - **Accès :** Protégé (Rôle Admin requis)
- **`/admin/produits`**
  - **Description :** Gestion des produits (ajout, modification, suppression).
  - **Accès :** Protégé
- **`/admin/articles`**
  - **Description :** Gestion des articles du magazine.
  - **Accès :** Protégé
- **`/admin/evenements`**
  - **Description :** Gestion des événements.
  - **Accès :** Protégé
- **`/admin/contenu`**
  - **Description :** Gestion des contenus divers : informations de contact, textes des sections "hero" (boutique, magazine), etc.
  - **Accès :** Protégé

### Pages Secondaires / Footer

- **`/a-propos`**
  - **Description :** Présentation de l'entreprise, histoire, valeurs.
  - **Accès :** Public
- **`/cgv`**
  - **Description :** Conditions Générales de Vente.
  - **Accès :** Public
- **`/mentions-legales`**
  - **Description :** Informations légales sur l'entreprise.
  - **Accès :** Public
- **`/politique-confidentialite`**
  - **Description :** Politique de gestion des données personnelles.
  - **Accès :** Public

---

## Flux de Navigation Clés

1.  **Parcours d'Achat Type (Invité ou Connecté) :**
    `/boutique` → (Clic sur produit) → `/boutique/[slug]` → (Clic 'Ajouter au panier') → (Affichage MiniCart/Toast) → (Clic icône panier) → `/panier` → (Clic 'Commander') → `/commande` → (Remplir infos + Clic 'Continuer') → `/commande/paiement` → (Effectuer paiement) → `/commande/confirmation/[orderId]`

2.  **Consultation Compte Utilisateur :**
    (Clic 'Connexion') → `/login` → (Soumettre formulaire) → Redirection vers `/profil` (ou page précédente) → (Navigation via menu profil) → `/profil/commandes` → (Clic sur une commande) → `/profil/commandes/[id]`
    *ou*
    `/profil` → (Navigation via menu profil) → `/profil/adresses`

---

*Note : Cette structure est basée sur le plan actuel du MVP et est susceptible d'évoluer.*

## Configuration des alias (tsconfig & next.config)
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }

  }
}
// next.config.js
const path = require('path');
module.exports = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  }
};
```

## Internationalisation (i18n)
- Fichiers de traduction dans `src/locales/[locale].json`.
- Middleware (`app/middleware.ts`):
```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['fr', 'en'];
export function middleware(request: NextRequest) {
  const locale = request.cookies.get('NEXT_LOCALE')?.value
    || request.headers.get('accept-language')?.split(',')[0]?.substring(0,2)
    || 'fr';
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(`/${locale}`)) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
```

## Exemple GitHub Actions CI
`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with: version: 7
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

