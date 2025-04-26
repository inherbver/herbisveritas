# README.md

# InHerbisVeritas

## Base de données Supabase (MVP)

### Tables principales

- **profiles** : Extension de la table utilisateurs Supabase (auth.users), stocke les infos de profil (nom, email, etc.).
- **products** : Catalogue produits (nom, description, prix, image, stock, actif).
- **carts / cart_items** : Gestion du panier utilisateur (un panier par user, items associés).
- **orders / order_items** : Gestion des commandes et de leurs lignes (historique, statut, total, etc.).
- **addresses** : Adresses de livraison des utilisateurs.
- **newsletter_subscribers** : Emails inscrits à la newsletter.

### Sécurité Row Level Security (RLS)

- **profiles** :
  - Seul l’utilisateur peut voir/modifier son profil.
- **products** :
  - Lecture publique des produits actifs.
- **carts / cart_items** :
  - Seul l’utilisateur peut accéder à son panier et ses items.
- **orders / order_items** :
  - Seul l’utilisateur peut accéder à ses commandes et lignes de commande.
- **addresses** :
  - Seul l’utilisateur peut accéder à ses adresses.
- **newsletter_subscribers** :
  - Tout le monde peut s’inscrire. Lecture privée (admin à venir).

#### Exemple de politique RLS (pour `profiles`)
```sql
alter table profiles enable row level security;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);
```

> Toutes les tables sont protégées par défaut : un utilisateur ne voit que ses données (sauf produits publics et inscription newsletter).

Pour plus de détails ou un script complet, voir la documentation technique ou demander à Cascade !

## Exemple de configuration `.env`

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# --- Stripe (optionnel) ---
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

# Ὠ README – Vibe Coding & MVP Reference

Bienvenue ! Ce README est ta boussole pour coder vite, bien, et sans friction vers le MVP. Il synthétise l’essentiel, te rappelle les pièges à éviter, t’inspire avec les meilleures pratiques, et t’offre des liens directs vers la doc détaillée pour chaque besoin.

---

## 1. Stack & Objectif
- **React 18.2+ / Next.js 15+ (App Router)**
- **TypeScript 5.x / Tailwind CSS 3.3+ / shadcn/ui (Base par défaut pour les composants UI)**
- **Zustand (état global), React Hook Form + Zod (formulaires/validation)**
- **Supabase 2.x (auth, DB, RLS), Prisma-compatible**
- **CI/CD GitHub Actions, déploiement Vercel**
- **Tests : Jest, RTL, Playwright/Cypress, axe/lighthouse**
- **MVP e-commerce moderne, mobile-first, sécurisé, scalable, multilingue (fr/en/de/es)**

---

## 2. Setup & Onboarding Express
```bash
git clone <repo>
cd <repo>
pnpm install
cp .env.example .env.local
# Configure tes variables d’environnement (Supabase, Stripe…)
pnpm dev
```
- Prérequis : **Node.js 18.2.0** (vérifier avec `node -v`), pnpm, accès Supabase/GitHub
- Pour le détail structurel : [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 3. Coding Flow – Les Rappels qui Sauvent
- **Jamais de callback Server → Client Components !** ([CHANGELOG.md](./CHANGELOG.md#transfert-de-fonctions-entre-server-et-client-components))
- **Toujours `await params` dans Next.js 15+** ([CHANGELOG.md](./CHANGELOG.md#paramètres-de-route-nextjs---usage-asynchrone))
- **Centralise l’état global avec Zustand** ([ARCHITECTURE.md](./ARCHITECTURE.md#patterns--bonnes-pratiques))
- **Checklist accessibilité & SEO à chaque composant** ([DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#accessibilité))
- **Tests à chaque fonctionnalité, CI obligatoire** ([TESTING.md](./TESTING.md))
- **Sécurité : jamais de secrets en dur, cookies httpOnly/secure, RLS activé** ([SECURITY.md](./SECURITY.md))

---

## 4. Roadmap MVP – Les Jalons à Valider
- [x] Stores Zustand (panier, produits, auth)
- [x] Pages boutique, détail produit, panier, tunnel de commande (adresse, paiement, confirmation)
- [ ] Auth Supabase, gestion des rôles, historique commandes, profil utilisateur
- [ ] Interface admin CRUD, audit log, sécurité renforcée
- [ ] Checklist SEO/accessibilité, tests, déploiement Vercel

---

## 5. Liens Vibe Coding (Doc Spécifique)
- [CHANGELOG.md](./CHANGELOG.md) — ὁ Pièges, solutions, patterns validés, expériences passées
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Structure, conventions, patterns, bonnes pratiques
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — UI, tokens, accessibilité, SEO, checklist composant
- [ENVIRONMENTS.md](./ENVIRONMENTS.md) — Environnements, secrets, CI/CD
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution, style, workflow
- [ONBOARDING.md](./ONBOARDING.md) — Setup rapide, premiers pas, tips
- [TESTING.md](./TESTING.md) — Stratégie de tests, SEO, accessibilité, E2E
- [SECURITY.md](./SECURITY.md) — Sécurité, audit, bonnes pratiques
- [TUTORIAL.md](./TUTORIAL.md) — Intégration Prisma/Supabase, guides avancés

---

## 6. Expériences & Points de Vigilance
- **Next.js App Router** : bien séparer Server/Client, ne pas transmettre de fonctions, toujours await params
- **UI/UX** : props natives uniquement, pattern polymorphique via Radix UI/Slot

- **Accessibilité** : balises sémantiques, ARIA, tests axe/lighthouse systématiques
- **Sécurité** : RLS Supabase, audit log, cookies httpOnly, pas de secrets exposés
- **Tests & CI/CD** : lint, build, tests unitaires/E2E/accessibilité/SEO à chaque PR
- **Onboarding** : script setup, doc synthétique, exemples concrets
- **Scalabilité** : préparer la compatibilité Prisma, analytics, observabilité

> **Ce README est ton point d’entrée “vibe coding” : commence ici, approfondis via les liens, code avec sérénité, vise le MVP et amuse-toi Ὠ !**

# Composants
### Organisation des Composants

La structure des composants suit une approche Atomic Design adaptée :

```
src/
└── components/
    ├── ui/           # Composants shadcn/ui ajoutés via CLI
    ├── primitives/   # Atomes UI maison (si non couverts par shadcn/ui)
    ├── shared/       # Composants transverses réutilisables
    ├── layout/       # Structure globale et mise en page
    └── domain/       # Composants spécifiques métier (Boutique, Panier, Admin...)
```

- **Primitives (`src/components/ui` et `src/components/primitives`) :** Briques UI de base, prioritairement via `shadcn/ui`.
- **Layout (`src/components/layout`) :** Structure des pages (Header, Footer, Container...). 
- **Shared (`src/components/shared`) :** Composants réutilisables dans plusieurs contextes (ProductCard, Pagination...). 
- **Domain (`src/components/domain`) :** Composants spécifiques à une fonctionnalité (ProductFilters, CartItem, OrderHistory...). 

**Pour un catalogue détaillé des composants existants et leur contexte d'utilisation, veuillez consulter le fichier [DESIGN_SYSTEM.md](doc/DESIGN_SYSTEM.md).**

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

## Conseils pour la réussite du projet

- **Documente tout** : garde la documentation vivante, chaque règle et décision doit être accessible et à jour.
- **Automatise les tests** dès la création des composants/pages pour éviter la dette technique.
- **Priorise l’accessibilité et le SEO** dès la conception, pas en post-production.
- **Respecte la centralisation des couleurs/thème et la structure des composants** pour garantir la cohérence visuelle et la maintenabilité.
- **Prévois l’évolutivité** : pense à la compatibilité Prisma, à l’ajout de rôles, à la croissance de l’équipe.
- **Sécurise l’admin** avec une défense en profondeur et prépare la montée en sécurité (2FA, logs, rôles tech).
- **Valide chaque jalon** par des tests E2E, SEO, accessibilité et un audit de code.
- **N’hésite pas à itérer** : le MVP doit être fiable, mais l’amélioration continue est la clé.
- **Onboarde les nouveaux développeurs** avec des guides synthétiques et des exemples concrets.

## Roadmap Générale InHerbisVeritas

### Phase 0 – Initialisation & Fondations
- Initialisation du dépôt, CI/CD, documentation, structure de dossiers.
- Configuration Supabase, gestion des couleurs/thème, i18n, environnements.

### Phase 1 – Design System & Composants Structurels
- Développement du design system, primitives, structure UI, Storybook, accessibilité.

### Phase 2 – Parcours Utilisateur Public (MVP)
- Boutique, panier, checkout, auth Supabase, commande guest/user, pages informatives, paiement Stripe, tests E2E.

### Phase 3 – Interface d’Administration
- Sécurisation des routes admin, interface CRUD admin, gestion utilisateurs/commandes, audit log, tests admin.

### Phase 4 – SEO, Analytics & Qualité
- Checklist SEO, PostHog, automatisation des tests SEO/accessibilité, optimisation perf/mobile.

### Phase 5 – Internationalisation & Magazine
- Activation i18n En, développement du magazine, SEO éditorial, gestion avancée des rôles.

### Phase 6 – Évolutivité & Améliorations Futures
- Préparation Prisma, fonctionnalités avancées, gestion des droits, versionning, onboarding continu.

---

## Ἲ Thème, couleurs et design system

### Centralisation du design avec Tailwind CSS

- **Définir toutes les couleurs dans `tailwind.config.js`** sous `theme.colors` (tu peux même importer un fichier JSON ou JS si besoin de plus de modularité).
- **Créer des “presets” ou des “plugins” Tailwind** si tu veux partager des tokens/designs entre plusieurs projets.
- **Documenter la nomenclature** (par exemple, `bg-primary`, `text-accent`, etc.) pour que toute l’équipe utilise les bonnes classes.
- **Utiliser exclusivement les classes utilitaires Tailwind** pour garantir la cohérence et la maintenabilité du design sur tout le projet.
- **Éviter les styles inline ou CSS custom** sauf cas très spécifiques (ex : animation complexe non couverte par Tailwind).

# PROJECT.md

# PROJECT.md - InHerbisVeritas (Vision et Feuille de route MVP)

## 1. Vision & Objectifs Généraux

Créer une boutique e-commerce et magazine **robuste, mobile-first, SEO friendly, accessible, évolutive**, basée sur Next.js 15+, Supabase, Tailwind, shadcn/ui, respectant les meilleures pratiques 2025 et prête pour l’internationalisation (Fr/En).

**Objectif MVP :** Permettre à un **guest ou un utilisateur authentifié** de passer commande de bout en bout de façon sécurisée, testée, documentée et avec une UX fluide. Le projet doit respecter les standards de qualité, sécurité et évolutivité, avec une architecture claire.

---

## 2. Fonctionnalités MVP & Parcours Utilisateur

### 2.1 Fondations & Design System
- Initialiser le repo avec Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- Structurer les dossiers : `app/`, `src/components/` (primitives, shared, layout, domain), `src/lib/`, `src/hooks/`, `src/types/`, `e2e/`.
- Mettre en place le design system (tokens centralisés dans `tailwind.config.js`, composants UI de base, accessibilité native).
- Configurer Supabase (auth, DB, stockage, RLS), Zustand (état global), React Hook Form + Zod (formulaires).

### 2.2 Pages Publiques & Navigation
- Navbar & Footer (accessibilité, responsive, navigation claire).
- Page Boutique (listing produits, filtres/tri basiques, hero section configurable depuis l'admin).
- Page Détail Produit (infos, quantité, prix, conseils, composition, sélecteur quantité, images multiples).
- Panier (ajout, suppression, modification quantité, affichage total, persistance via Zustand/localStorage).
- Pages informatives statiques (gérées depuis l'admin si possible) : mentions légales, CGV/CGU, politique de retour, contact, FAQ.

### 2.3 Authentification & Espace Utilisateur
- Connexion/Inscription (Supabase Auth UI ou composants custom, gestion des erreurs, UX fluide).
- Gestion basique du profil utilisateur (historique commandes simplifié, infos personnelles modifiables).

### 2.4 Commande & Paiement (Checkout Hybride)
- **Objectif :** Permettre la commande en tant qu'invité (guest) ou utilisateur connecté (user) avec une friction minimale.
- **Guest checkout :**
    - Commande sans compte requis.
    - Collecte email, adresse, validation Zod.
    - Création commande en DB associée à l'email.
    - Après paiement, **invitation optionnelle à créer un compte** en un clic (infos pré-remplies).
- **User checkout :**
    - Pré-remplissage des informations depuis le profil.
    - Rattachement automatique de la commande à l’utilisateur.
    - Accès à l'historique complet des commandes via le profil.
- **Processus commun :**
    - Validation panier (stock, prix).
    - Sélection adresse livraison/facturation.
    - Intégration paiement sécurisé (Stripe Elements/Checkout).
    - Page confirmation de commande (récapitulatif, instructions, lien vers suivi si user).
    - Notifications email basiques (confirmation commande).

### 2.5 Administration Basique (CRUD)
- Interface admin sécurisée (layout dédié, accès restreint par middleware + RLS).
- Gestion produits (CRUD complet).
- Gestion commandes (vue liste, détail, mise à jour statut basique).
- Gestion articles/magazine (CRUD simple avec éditeur type Markdown/TipTap pour la V2).
- Gestion pages statiques/Hero Section (pour flexibilité).

---

## 3. Exigences Transverses (Qualité, Sécurité, Évolutivité)

### 3.1 Qualité, Tests & CI/CD
- **Qualité du code :** ESLint (Airbnb), Prettier, TypeScript strict, Convention de nommage.
- **Tests :**
    - Unitaires (Jest/RTL) : composants critiques, logique métier (panier, calculs), helpers.
    - Intégration (Jest/RTL/MSW) : interactions composants, API routes custom si besoin.
    - End-to-end (Playwright) : scénarios clés (inscription, ajout panier, commande guest, commande user).
- **CI/CD (GitHub Actions) :** Lint, build, tests automatisés sur chaque PR, déploiement auto (Vercel).
- **Monitoring :** Logs basiques, suivi erreurs (Vercel Analytics / Sentry gratuit).

### 3.2 Sécurité
- **Défense en profondeur :** Middleware Next.js (`matcher`) + vérification systématique côté serveur (`supabase.auth.getUser()`) pour toutes les actions/routes sensibles.
- **RLS Supabase :** Configurées par défaut pour que les users ne voient que leurs données. Accès admin via rôle spécifique ou clé service pour les opérations serveur.
- **Validation :** Zod pour toutes les entrées formulaires et paramètres API.
- **Gestion des secrets :** Variables d'environnement (`.env.local`, Vercel env variables), **aucun secret en dur**.
- Voir `SECURITY.md` pour détails (pas encore fusionné).

### 3.3 Accessibilité & SEO
- **Mobile-first :** Conception et tests prioritaires sur mobile.
- **Accessibilité (AA minimum) :** Balises sémantiques HTML5, contrastes couleurs (via shadcn/design system), navigation clavier, attributs ARIA si nécessaire. Tests Lighthouse/Axe.
- **SEO :** Balises `meta` dynamiques (titre, description), OpenGraph basique, sitemap généré (`next-sitemap`), performances (Core Web Vitals via Vercel Analytics).

### 3.4 Évolutivité & Préparation Futur
- **Architecture :** Découplage composants (atomiques, molécules, organismes), centralisation logique métier (`lib`), hooks réutilisables.
- **Design System :** Centralisé via Tailwind/shadcn pour cohérence et maintenance facile.
- **Base de données :** Schéma Supabase propre, compatible avec migration future vers Prisma si besoin.
- **Internationalisation (i18n) :** Structure prête (`next-intl` ou similaire) pour ajout facile de langues (Fr/En prévus).
- **Analytics :** Préparation pour intégration facile (PostHog/Plausible).

---

### Nouvelle Roadmap Phasée MVP

1.  **Phase 1 : Visualisation de la Boutique (Core Setup & Mock Data)**
    *   **Fondations Techniques :** Initialiser le projet (Next.js, TS, Tailwind, `shadcn/ui` setup CLI). Configurer Lint/Prettier.
    *   **Design System Minimal :** Installer les composants `shadcn/ui` essentiels (`button`, `card`). Configurer `tailwind.config.js` de base.
    *   **Layout de Base :** Créer les composants `Header`, `Footer`, `Container` et le layout principal (`layout.tsx`).
    *   **Page Boutique Statique :** Créer les composants `ProductCard`, `ProductGrid`. Développer la page `/boutique` en utilisant du **mock data** pour afficher les produits. Mettre en place le routing de base.
2.  **Phase 2 : Dynamisation Boutique & Admin Produits**
    *   **Connexion Backend :** Configurer Supabase (client, table `products` basique).
    *   **Données Réelles :** Remplacer le mock data de la page boutique par des données venant de Supabase.
    *   **Admin Minimal (Produits) :** Créer l'interface d'administration sécurisée (layout dédié, middleware) permettant le CRUD (Créer, Lire, Mettre à jour, Supprimer) des produits.
3.  **Phase 3 : Fonctionnalités E-commerce Essentielles**
    *   **Page Détail Produit :** Développer la page individuelle pour un produit.
    *   **Panier :** Implémenter la logique du panier (ajout, modification, suppression) avec Zustand/localStorage.
    *   **Authentification :** Mettre en place la connexion/inscription (Supabase Auth).
    *   **Checkout Hybride :** Développer le tunnel de commande pour invités et utilisateurs connectés, incluant la sélection d'adresse et l'intégration du paiement (Stripe).
    *   **Espace Utilisateur Minimal :** Page profil basique avec historique des commandes.
    *   **Mise en place de la gestion d'état client pour le panier avec Zustand (`cartStore`).**
4.  **Phase 4 : Finalisation & Contenus Annexes**
    *   **Admin Complet :** Ajouter la gestion des commandes, articles (magazine), pages statiques.
    *   **Pages Publiques Annexes :** Développer les pages Magazine, Événements (si MVP), pages statiques (CGV, etc.).
    *   **Qualité & Tests :** Mettre en place la stratégie de tests complète (Unit, Integration, E2E critiques).
    *   **Optimisations & Exigences Transverses :** Finaliser l'accessibilité, le SEO, l'internationalisation (i18n), CI/CD, monitoring.

# ROADMAP.md

# ROADMAP.md

Ce document détaille les étapes de développement du projet InHerbisVeritas.

*Légende :*
*   `[ ]` : Tâche à faire
*   `ᾞ Composants Clés :` Liste des composants UI majeurs impliqués.
*   `⚠️ Points d'Attention :` Difficultés potentielles ou points critiques basés sur l'expérience générale (ne provient pas de l'ancien fichier `SUFFERS.md`).

---

## 1. Initialisation & Fondations

### 1.1. Préparation du projet
- [x] Création du dépôt Git, configuration des branches principales
- [x] Mise en place du workflow Git (feature branches, PR, conventions de nommage)
- [x] Initialisation Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- [ ] Ajout des outils de qualité : ESLint (AirBnB), Prettier, Husky (pré-commit), commitlint
    - ᾞ **Composants Clés :** N/A (Configuration)
    - ⚠️ **Points d'Attention :**
        - Conflits de configuration entre outils (ESLint, Prettier, TSConfig).
        - Configuration correcte de `shadcn/ui` (chemins, `tailwind.config.js`, `globals.css`).
        - **Spécifique (SUFFERS.md) :** Problèmes potentiels avec les alias d'import `@/` si `tsconfig.json` et `next.config.js` ne sont pas correctement configurés.
        - Compatibilité des versions des dépendances.
        - **Spécifique (SUFFERS.md) :** Attention aux problèmes de cache IDE/Next.js pouvant masquer/afficher des erreurs temporairement après modifications.

### 1.2. Configuration des environnements
- [ ] Création des fichiers `.env.local`, `.env.test`, `.env.production`
- [ ] Configuration des accès Supabase (auth, DB, storage) et, si besoin, Stripe
- [ ] Documentation des variables d’environnement requises
    - ᾞ **Composants Clés :** N/A (Configuration)
    - ⚠️ **Points d'Attention :**
        - Sécurisation des clés API (ne pas commiter `.env.local`, utiliser les variables d'env Vercel/Supabase en prod).
        - Différences de configuration entre environnements (ex: URL Supabase).
        - Assurer que toutes les variables requises sont documentées et présentes.
        - **Spécifique (SUFFERS.md) :** Éviter la duplication de code entre pages (préférer redirection/factorisation) et vérifier l'unicité des définitions utilitaires.

### 1.3. Mise en place du Design System
- [ ] Création des dossiers `src/components/ui`, `primitives`, `shared`, `layout`, `domain`.
- [ ] Centralisation des tokens (couleurs, tailles, typographies) dans `tailwind.config.js`.
- [ ] Développement des composants UI : **Prioriser l'utilisation des composants `shadcn/ui` existants**. Créer des composants personnalisés uniquement si nécessaire, en suivant les conventions Atomic Design et en s'inspirant de `shadcn/ui`.
    - ᾞ **Composants Clés :** `Button`, `Input`, `Card`, `Badge`, `Spinner`, `Dialog`, `Toast`, Composants `shadcn/ui` de base.
    - ⚠️ **Points d'Attention :**
        - Maintenir la cohérence avec `shadcn/ui` lors de la création de composants personnalisés.
        - Éviter la sur-ingénierie des composants "atomiques".
        - Assurer l'accessibilité (ARIA, navigation clavier) dès le début.
- [ ] Mise en place de Storybook pour documenter et tester visuellement les composants.
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
- [ ] Configuration de `next-intl`.
- [ ] Création des fichiers de locales initiaux (ex: `fr.json`, `en.json`).
- [ ] Mise en place du middleware pour la détection de la langue.
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
        - Assurer que *toutes* les opérations sensibles sont validées côté serveur (Server Actions, Route Handlers).
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
- [ ] Page profil (`/profil`) avec informations de base.
    - ᾞ **Composants Clés :** `ProfileForm`, `UserInfoDisplay`.
- [ ] Historique des commandes (`/profil/commandes`).
    - ᾞ **Composants Clés :** `OrderHistoryTable`, `OrderListItem`.
- [ ] Gestion des adresses enregistrées (`/profil/adresses`).
    - ᾞ **Composants Clés :** `AddressList`, `AddressCard`, `AddressForm` (réutilisé?).
    - ⚠️ **Points d'Attention (communs Espace Utilisateur) :**
        - Récupération sécurisée des données utilisateur (RLS).
        - Gestion des états de chargement/erreur pour les données du compte.
        - Assurer que seul l'utilisateur connecté peut voir/modifier ses propres données.

---

## 4. Contenus Annexes & Finalisation

### 4.1. Pages Statiques
- [ ] Page d'accueil (`/boutique` - déjà listée)
- [ ] Page 'À propos' (`/a-propos`)
- [ ] Page de contact (`/contact`)
- [ ] Pages légales (CGV, Politique de confidentialité, Mentions Légales).
    - ᾞ **Composants Clés :** `StaticPageLayout`, `ContactForm`.
    - ⚠️ **Points d'Attention :** Remplissage du contenu, mise en page responsive simple.

### 4.2. Fonctionnalités Additionnelles (Post-MVP si nécessaire)
- [ ] Système de recherche.
- [ ] Avis produits.

- [ ] Blog/Magazine (`/magazine`).
- [ ] Liste de souhaits (Wishlist).
    - ᾞ **Composants Clés :** `SearchBar`, `ReviewForm`, `ReviewList`, `ArticleCard`, `ArticleDetail`, `WishlistButton`, `WishlistPage`.
    - ⚠️ **Points d'Attention :** Complexité variable selon la fonctionnalité (ex: recherche full-text, modération des avis, gestion état wishlist).

### 4.3. Optimisations & Tests
- [ ] Optimisation des performances (images, code splitting, Lighthouse).
    - ᾞ **Composants Clés :** `next/image`, analyseurs de bundle.
    - ⚠️ **Points d'Attention :** Optimisation des images (formats, tailles), identification des goulots d'étranglement (JS lourd, requêtes lentes).
- [ ] Implémentation du chargement progressif des images (Lazy Loading).
- [ ] Tests unitaires et d'intégration (Jest, RTL).
    - ᾞ **Composants Clés :** Fichiers `*.test.tsx`, mocks (ex: MSW pour API).
    - ⚠️ **Points d'Attention :**
        - Mocker efficacement les dépendances (Supabase, Zustand, Server Actions), tester le comportement plutôt que l'implémentation, maintenir les tests à jour.
        - **Spécifique (SUFFERS.md) :** Difficultés rencontrées avec Jest et Next.js 15 (potentiellement liés à ESM/CJS, App Router). La solution temporaire avait été de déprioriser les tests.
- [ ] Tests End-to-End (Playwright/Cypress).
    - ᾞ **Composants Clés :** Scripts de test E2E.
    - ⚠️ **Points d'Attention :** Stabilité des tests (timeouts, sélecteurs fragiles), gestion de l'état initial (fixtures, seeding DB), temps d'exécution.
- [ ] Revue d'accessibilité.
- [ ] Validation SEO technique.
    - ᾞ **Composants Clés :** Outils d'audit (axe-core, Lighthouse).
    - ⚠️ **Points d'Attention :** Corriger les problèmes d'accessibilité peut nécessiter des refactorisations, assurer la génération correcte des meta tags dynamiques.

### 4.4. Déploiement
- [ ] Configuration de la CI/CD (ex: GitHub Actions vers Vercel).
- [ ] Mise en place du monitoring et logging.
- [ ] Déploiement final en production.
    - ᾞ **Composants Clés :** Fichiers de workflow CI/CD (`.github/workflows/`), configuration Vercel.
    - ⚠️ **Points d'Attention :**
        - Configuration correcte des builds/tests/déploiements dans la CI.
        - Gestion des variables d'environnement spécifiques à la prod/preview.
        - Stratégie de rollback.
        - Monitoring post-déploiement.

---

## Gestion des environnements
Détails des variables d’environnement requises (résolu) :
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...
```

## Onboarding rapide
1. Cloner le dépôt : `git clone <repo> && cd <repo>`
2. Installer les dépendances : `pnpm install`
3. Copier l’exemple : `cp .env.example .env.local` et renseigner les variables
4. Lancer le serveur de développement : `pnpm dev`

## Tutoriel avancé (Placeholder)
Un guide détaillé pour l’intégration Prisma/Supabase et guides avancés sera ajouté ici.