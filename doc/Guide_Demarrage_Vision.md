# Composants

### Organisation des Composants

La structure des composants suit une approche Atomic Design adaptée :

```
### Organisation des Composants

La structure des composants suit une approche Atomic Design adaptée, visant à la fois la réutilisabilité et la clarté métier :

```

src/
└── components/
├── ui/ # Composants shadcn/ui installés via CLI
├── primitives/ # Petits atomes UI maison
├── shared/ # Blocs réutilisables multi-pages
├── layout/ # Gabarits de page et structures
└── domain/ # Composants métier spécifiques (Shop, Cart, etc.)

```
**✅ Détail par dossier et Plan de Développement**

#### 1. `src/components/ui/`

🔹 **Objectif :** Utiliser `shadcn/ui` comme base pour les éléments UI standards.
🔹 **Composants shadcn :**

*   **Déjà installés :** Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Dialog, DropdownMenu, HoverCard, Input, Label, Popover, RadioGroup, Select, Separator, Skeleton, Switch, Table, Tabs, Textarea, Toast, Tooltip
*   **À ajouter pour MVP :** _(Tous les composants UI shadcn nécessaires pour le MVP sont installés)_

#### 2. `src/components/primitives/`

🔹 **Objectif :** Créer des atomes UI fondamentaux non fournis par `shadcn/ui` ou nécessitant une personnalisation profonde.
🔹 **Atomes :**

*   **Déjà installés :** ErrorBoundary, Heading, IconButton, Link, Logo, SkipNavLink/SkipNavTarget, Text
*   **À ajouter pour MVP :** _(Aucun prévu pour le MVP initial)_

#### 3. `src/components/shared/`

🔹 **Objectif :** Construire des blocs UI complexes et réutilisables à travers différentes pages.
🔹 **Blocs :**

*   **Déjà installés :** Breadcrumb, CardGrid/ListView, FilterPanel, Footer, Header, HeroSection, Modal, Pagination, SearchBar
*   **À ajouter pour MVP :** _(Aucun prévu pour le MVP initial)_

#### 4. `src/components/layout/`

🔹 **Objectif :** Définir les structures et gabarits de page principaux.
🔹 **Layouts :**

*   **Déjà installés :** AuthLayout, Container, ErrorLayout, MainLayout
*   **À ajouter pour MVP :** DashboardLayout (optionnel post-MVP)

#### 5. `src/components/domain/`

🔹 **Objectif :** Isoler les composants spécifiques à une fonctionnalité métier.
🔹 **Composants métier :**

*   **Déjà installés :**
    *   *Shop:* CategoryFilter, ProductCard, ProductGrid
    *   *Product Details:* ProductDescriptionTabs, ProductImageGallery, QuantitySelector
    *   *Cart:* CartItem, CartSummary, MiniCart
    *   *Profile:* AddressBook, OrderHistory, ProfileForm
    *   *Authentication:* ForgotPasswordForm, LoginForm, RegisterForm
*   **À ajouter pour MVP :** _(Aucun nouveau composant de domaine prévu pour le MVP initial)_

🛒 **Pages Couvertes par ces Composants (MVP) :**

| Page            | Composants clés utilisés                                           |
| :-------------- | :----------------------------------------------------------------- |
| Shop            | Header, SearchBar, FilterPanel, ProductGrid, Pagination            |
| Product Details | ProductCard, ProductDescriptionTabs, QuantitySelector              |
| Cart            | CartItem, CartSummary, MiniCart                                    |
| Profile         | ProfileForm, OrderHistory                                          |
| Sign In/Sign Up | AuthLayout, LoginForm, RegisterForm                              |

**Avantages de cette structure :**

*   ✅ Haute réutilisabilité (`shared/`)
*   ✅ Domaines métiers bien isolés (`domain/`)
*   ✅ Primitives solides (`primitives/`)
*   ✅ Structure scalable
*   ✅ Compatible `shadcn/ui`, Tailwind, Next.js App Router

### Composants

Le design system de InHerbisVeritas est structuré en couches, avec une organisation claire des composants pour favoriser la réutilisation et la maintenabilité.

### Composants Domaine

Ces composants sont spécifiques à des fonctionnalités métier particulières :

#### Boutique

- **ProductGrid** - Grille de produits avec filtres
- **ProductDetails** - Affichage détaillé d'un produit
- **ProductGallery** - Galerie d'images de produit
- **ProductSpecifications** - Spécifications techniques
- **ProductComposition** - Composition du produit
- **RelatedProducts** - Produits similaires ou recommandés
- **ProductFilters** - Filtres de recherche pour les produits

#### Panier

- **Cart** - Panier d'achat complet
- **CartItem** - Élément individuel du panier
- **CartSummary** - Résumé de la commande
- **ShippingForm** - Formulaire d'adresse de livraison
- **PaymentForm** - Formulaire de paiement
- **OrderSummary** - Récapitulatif de commande
- **OrderConfirmation** - Confirmation de commande

#### Magazine

- **ArticleGrid** - Grille d'articles avec filtres
- **ArticleContent** - Contenu formaté d'un article
- **ArticleHeader** - En-tête d'article
- **ArticleTags** - Tags d'article
- **RelatedArticles** - Articles similaires ou recommandés

#### Événements

- **EventList** - Liste des événements
- **EventDetails** - Détails d'un événement
- **EventCalendar** - Calendrier des événements
- **EventRegistration** - Formulaire d'inscription à un événement

#### Profil

- **UserProfile** - Profil utilisateur
- **OrderHistory** - Historique des commandes
- **AddressBook** - Carnet d'adresses
- **Wishlist** - Liste de souhaits

#### Admin

- **Dashboard** - Tableau de bord admin
- **UserManagement** - Gestion des utilisateurs
- **OrderManagement** - Gestion des commandes
- **ProductEditor** - Éditeur de produit
- **ArticleEditor** - Éditeur d'article avec WYSIWYG
- **EventEditor** - Éditeur d'événement
- **ContentEditor** - Éditeur de contenu pour pages statiques
- **SettingsPanel** - Panneau de configuration du site
- **Analytics** - Affichage des statistiques et métriques

---

## 1. Initialisation & Fondations

### 1.1. Préparation du projet

- [x] Création du dépôt Git, configuration des branches principales
- [x] Mise en place du workflow Git (feature branches, PR, conventions de nommage)
- [x] Initialisation Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- [x] Configuration initiale de l'internationalisation (i18n) avec `next-intl` (middleware, `i18n.ts`, fichiers de messages, configuration de la navigation)
- [x] Mise en place de la structure de base pour les routes localisées (ex: `/app/[locale]/...`)
- [x] Création et configuration d'une route dynamique localisée (ex: `/app/[locale]/product/[slug]/page.tsx`)
- [x] Ajout des outils de qualité : ESLint (AirBnB), Prettier, Husky (pré-commit), commitlint
  - ᾞ **Composants Clés :** N/A (Configuration)
  - ⚠️ **Points d'Attention :**
    - Conflits de configuration entre outils (ESLint, Prettier, TSConfig).
    - Configuration correcte de `shadcn/ui` (chemins, `tailwind.config.js`, `globals.css`).
    - **Configuration `next-intl`**: Précision requise pour le middleware, `i18n.ts`, la structure des fichiers de messages, et la configuration des `pathnames` dans `navigation.ts` pour inclure les routes statiques et dynamiques.
    - **TypeScript & `next-intl`**: Potentiels problèmes de typage lors de l'utilisation de liens `next-intl/navigation` (`Link`), surtout avec des routes dynamiques. Peut nécessiter des types personnalisés ou des assertions de type (`as`).
    - **Async/Await avec `params`**: Dans Next.js 15+, nécessité d'utiliser `await params` avant d'accéder aux propriétés (`params.locale`, `params.slug`) dans les Server Components.
    - **Spécifique (SUFFERS.md) :** Problèmes potentiels avec les alias d'import `@/` si `tsconfig.json` et `next.config.js` ne sont pas correctement configurés.

### 1.2. Configuration des environnements

- [x] Création des fichiers `.env.local`, `.env.test`, `.env.production`
- [ ] Configuration des accès Supabase (auth, DB, storage) et, si besoin, Stripe
- [x] Documentation des variables d’environnement requises
  - ᾞ **Composants Clés :** N/A (Configuration)
  - ⚠️ **Points d'Attention :**
    - Sécurisation des clés API (ne pas commiter `.env.local`, utiliser les variables d'env Vercel/Supabase en prod).
    - Différences de configuration entre environnements (ex: URL Supabase).
    - Assurer que toutes les variables requises sont documentées et présentes.
    - **Spécifique (SUFFERS.md) :** Éviter la duplication de code entre pages (préférer redirection/factorisation) et vérifier l'unicité des définitions utilitaires.

### 1.3. Mise en place du Design System

- [x] Création des dossiers `src/components/ui`, `primitives`, `shared`, `layout`, `domain`
- [x] Centralisation des tokens (couleurs, tailles, typographies) dans `tailwind.config.js` / `globals.css`. (Note: Thème principal via variables CSS dans `globals.css`, extensions spécifiques dans `tailwind.config.js`)
- [ ] Développement des composants UI : **Prioriser l'utilisation des composants `shadcn/ui` existants**. Créer des composants personnalisés uniquement si nécessaire, en suivant les conventions Atomic Design et en s'inspirant de `shadcn/ui`.
- ᾞ **Composants Clés :** `Button`, `Input`, `Card`, `Badge`, `Spinner`, `Dialog`, `Toast`, Composants `shadcn/ui` de base.
  - ⚠️ **Points d'Attention :**
    - Maintenir la cohérence avec `shadcn/ui` lors de la création de composants personnalisés.
    - Éviter la sur-ingénierie des composants "atomiques".
    - Assurer l'accessibilité (ARIA, navigation clavier) dès le début.
  - ᾞ **Composants Clés :** Intégration avec les composants existants.
  - ⚠️ **Points d'Attention :** Configuration initiale de Storybook avec Next.js App Router, Tailwind et TS peut être complexe.

---

## 2. Architecture & Organisation du Code

### 2.1. Structure des Dossiers

- [ ] Organisation stricte des dossiers : `app/`, `src/components/`, `src/domains/`, `src/lib/`, `content/`, `public/`.
- [ ] Préparation du dossier `src/domains/` pour la logique métier (produits, users, commandes).
- [ ] Mise en place des conventions d’export, PascalCase, balises HTML sémantiques.
  - ᾞ **Composants Clés :** N/A (Structure)
  - ⚠️ **Points d'Attention :** Maintenir la discipline sur la structure des dossiers au fur et à mesure que le projet grandit.
    - **Spécifique (SUFFERS.md) :** Éviter la duplication de code entre pages (préférer redirection/factorisation) et vérifier l'unicité des définitions utilitaires.

### 2.2. Patterns d'Architecture (Next.js App Router)

- [ ] Compréhension et documentation des Server Components vs Client Components.
- [ ] Mise en place de la gestion d'état (Zustand si besoin global, sinon `useState`/`useReducer`).
- [ ] Stratégie de fetching de données (Server Components, Route Handlers, Client-side fetching).

- [ ] Utilisation des Server Actions pour les mutations.
  - ᾞ **Composants Clés :** Distinction entre Server/Client Components, potentiellement HOCs ou hooks utilitaires.
  - ⚠️ **Points d'Attention :**
    - Mauvaise utilisation des Server/Client Components entraînant des erreurs ou des performances dégradées.
    - Difficulté à passer des données ou composants entre Server et Client.
    - Gestion complexe des erreurs et du chargement avec les Server Actions.
    - Choix de la bonne stratégie de fetching selon le cas d'usage.
    - **Spécifique (SUFFERS.md) :** Des composants utilisant des hooks client comme `usePathname` (souvent dans le Header) doivent être marqués explicitement avec `"use client"` (ou leur parent).
    - **Spécifique (SUFFERS.md) :** Erreurs fréquentes type "Event handlers cannot be passed to Client Component props" si une page/composant serveur tente de passer une fonction à un enfant "use client". Solution : marquer le parent "use client" si nécessaire.
    - **Spécifique (SUFFERS.md) :** Gérer la redirection de la page d'accueil (`/`) vers la page boutique (`/boutique`) via `redirect()` dans `app/page.tsx` si nécessaire.

### 2.3. Internationalisation (i18n)

- [x] Configuration de `next-intl`.
- [x] Création des fichiers de locales initiaux (ex: `fr.json`, `en.json`).
- [x] Mise en place du middleware pour la détection de la langue.
  - ᾞ **Composants Clés :** Composants wrapper pour `next-intl`, potentiellement sélecteur de langue.
  - ⚠️ **Points d'Attention :**
    - Gestion des traductions manquantes (fallback).
    - Intégration avec les Server Components (utilisation de `useTranslations` dans les Client Components, passage de `messages` aux Client Components).
    - Performance du chargement des locales.
    - **Spécifique (SUFFERS.md) :** La migration vers une structure avec `[locale]` (ex: `/app/[locale]/boutique`) nécessite d'adapter tous les imports et de bien gérer le middleware `next-intl`.

### 2.4. Sécurité

- [ ] Configuration de la sécurité Supabase (RLS).
- [ ] Protection des routes et API (middleware, validation Zod).
- [ ] Gestion des secrets et clés API.
  - ᾞ **Composants Clés :** Middleware (`middleware.ts`), wrappers de route protégée.
  - ⚠️ **Points d'Attention :**
    - Complexité de l'écriture et du test des policies RLS Supabase.
    - Assurer que _toutes_ les opérations sensibles sont validées côté serveur (Server Actions, Route Handlers).
    - Configuration correcte du middleware Next.js pour protéger les bonnes routes.

---

## 3. Fonctionnalités Principales (MVP)

### 3.1. Authentification Utilisateur

- [ ] Page de connexion (`/login`)
- [ ] Page d'inscription (`/register`)
  - ᾞ **Composants Clés :** `LoginForm`, `RegisterForm` (utilisant `Input`, `Button`, `Label` de `shadcn/ui`), `AuthLayout`.
  - ⚠️ **Points d'Attention :**
    - Gestion des erreurs de formulaire (validation Zod, feedback utilisateur).
    - Interaction avec Supabase Auth (gestion des sessions, erreurs Supabase).
    - Redirections après connexion/inscription.
- [ ] Logique de gestion de session (Supabase Auth)
- [ ] Protection des routes nécessitant une authentification.
  - ᾞ **Composants Clés :** Middleware, hooks (`useAuth`) ou contexte pour vérifier l'état d'authentification.
  - ⚠️ **Points d'Attention :** Gestion cohérente de l'état d'authentification entre Server et Client Components, gestion du rafraîchissement des tokens.

### 3.2. Catalogue Produits

- [ ] Page liste des produits (`/boutique`)
  - ᾞ **Composants Clés :** `ProductGrid`, `ProductCard`, `Pagination`, `FilterSidebar`, `SortDropdown`.
  - ⚠️ **Points d'Attention :**
    - Performance de l'affichage d'un grand nombre de produits.
    - Complexité de la logique de filtrage/tri (gestion des `searchParams`, mise à jour de l'UI).
    - Récupération efficace des données depuis Supabase (indexation, sélection des colonnes).
- [ ] Page détail produit (`/boutique/[slug]`)
  - ᾞ **Composants Clés :** `ProductDetailLayout`, `ImageGallery`, `AddToCartButton`, `VariantSelector` (si applicable), `RelatedProducts`.
  - ⚠️ **Points d'Attention :**
    - Distinction Server/Client pour les données statiques et l'interactivité (ex: galerie d'images, bouton ajout panier).
    - Gestion des états de chargement et d'erreur.
- [ ] Composants : `ProductCard`, `ProductFilters` (si besoin MVP)

  - ᾞ **Composants Clés :** `ProductCard`, `ProductFilters`.
  - ⚠️ **Points d'Attention :** **Spécifique (SUFFERS.md) :** Problèmes potentiels d'imports ou de typage lors de l'utilisation de `ProductCard` (vérifier export/import du type `Product`).

- [ ] Récupération des données produits depuis Supabase.

### 3.3. Panier d'Achat

- [ ] Logique d'ajout/suppression/modification des articles (probablement avec Zustand).
  - ᾞ **Composants Clés :** Store Zustand (`cartStore`), hooks associés (`useCart`).
  - ⚠️ **Points d'Attention :**
    - Structuration correcte du store Zustand (éviter les données redondantes, actions claires).
    - Persistance du panier (localStorage?).
    - Hydratation correcte de Zustand avec SSR/Server Components.
- [ ] Affichage du mini-panier dans le header.
  - ᾞ **Composants Clés :** `MiniCartIcon`, `MiniCartDropdown`.
  - ⚠️ **Points d'Attention :** Mise à jour en temps réel de l'icône lorsque le panier change.
- [ ] Page panier (`/panier`) avec récapitulatif.
  - ᾞ **Composants Clés :** `CartTable` / `CartItemList`, `CartItem`, `OrderSummary`, `CheckoutButton`.
  - ⚠️ **Points d'Attention :**
    - Synchronisation entre `cartStore` et l'affichage.
    - Calcul précis du total, des taxes, des frais de port.
    - Gestion des cas limites (panier vide).

### 3.4. Processus de Commande (Checkout)

- [ ] Tunnel de commande multi-étapes (adresse, livraison, paiement, confirmation).
  - ᾞ **Composants Clés :** `CheckoutLayout`, `StepIndicator`, `AddressForm`, `ShippingOptions`, `PaymentForm`, `OrderConfirmation`.
  - ⚠️ **Points d'Attention :**
    - Gestion de l'état entre les étapes (passer les données, valider chaque étape).
    - Complexité des formulaires (React Hook Form + Zod).
    - Distinction guest vs user connecté.
- [ ] Formulaires d'adresse (livraison/facturation).
- [ ] Intégration d'un fournisseur de paiement (ex: Stripe).
  - ᾞ **Composants Clés :** Composants Stripe Elements ou équivalent.
  - ⚠️ **Points d'Attention :**
    - Intégration technique avec l'API Stripe (côté client et serveur/Server Action pour confirmation).
    - Sécurité des paiements (PCI DSS).
    - Gestion des erreurs de paiement et feedback utilisateur.
- [ ] Création de la commande dans Supabase.
  - ᾞ **Composants Clés :** Server Action pour enregistrer la commande.
  - ⚠️ **Points d'Attention :** Transactionnalité (assurer que la commande n'est créée que si le paiement réussit), enregistrement de toutes les informations nécessaires.

### 3.5. Espace Utilisateur

- [ ] `/profil` (ProfileForm, UserInfoDisplay)
- [ ] `/profil/commandes` (OrderHistoryTable)
- [ ] `/profil/adresses` (AddressList, AddressCard, AddressForm)
  ⚠️ **Points d'Attention :** RLS, chargement, sécurisation

---

## 4. Contenus Annexes & Finalisation

### 4.1. Pages Statiques

- [ ] `/a-propos`, `/contact`, CGV/CGU, Mentions légales
  ᾞ **Composants Clés :** StaticPageLayout, ContactForm

### 4.2. Fonctionnalités Additionnelles (Post-MVP)

- [ ] Recherche, Avis produits, Magazine (`ArticleGrid`, etc.), Wishlist

### 4.3. Optimisations & Tests

- [ ] Perf (images, splitting)
- [ ] Lazy Loading images
- [ ] Tests unitaires (Jest/RTL), E2E (Playwright/Cypress)
  ⚠️ **Points d'Attention :** ESM/CJS, fixtures, stabilité

### 4.4. Déploiement

- [ ] CI/CD (GitHub Actions -> Vercel), monitoring, rollback
  ᾞ **Composants Clés :** `.github/workflows`, config Vercel
  ⚠️ **Points d'Attention :** Env prod/preview, tests builds

---

## Ἲ Thème, couleurs et design system
```
