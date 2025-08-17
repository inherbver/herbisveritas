# HerbisVeritas - Plateforme E-commerce Next.js

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple)](https://stripe.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb)](https://reactjs.org/)

Plateforme e-commerce moderne spécialisée dans les cosmétiques naturels et produits à base de plantes, construite avec les dernières technologies web et axée sur la performance, la sécurité et l'expérience utilisateur.

## Table des Matières

- [Démarrage Rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Stack Technologique](#stack-technologique)
- [Fonctionnalités](#fonctionnalités)
- [Structure du Projet](#structure-du-projet)
- [Scripts Disponibles](#scripts-disponibles)
- [Configuration](#configuration)
- [Documentation Technique](#documentation-technique)

## Démarrage Rapide

### Prérequis

- Node.js 20+ et npm
- Compte Supabase
- Compte Stripe (pour les paiements)

### Installation

```bash
# Cloner le repository
git clone https://github.com/inherbver/herbisveritas.git
cd herbisveritas

# Installer les dépendances
npm install

# Configuration environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials

# Démarrer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Architecture

HerbisVeritas utilise une architecture moderne **server-first** avec Next.js 15 App Router :

```mermaid
graph TB
    A[Client Browser] --> B[Next.js Middleware]
    B --> C[Server Components]
    B --> D[Client Components]

    C --> E[Server Actions]
    D --> F[Zustand Stores]

    E --> G[Business Services]
    F --> G

    G --> H[Supabase Client]
    H --> I[PostgreSQL + RLS]

    E --> J[External APIs]
    J --> K[Stripe]
    J --> L[Colissimo API]

    subgraph "Security Layer"
        M[Authentication]
        N[Authorization]
        O[RLS Policies]
    end

    H --> M
    M --> N
    N --> O
```

### Principes Architecturaux

- **Server Components par défaut** : Optimisation SEO et performance
- **State Management Hybride** : Server state + Zustand pour état client
- **Security by Design** : RLS, middleware de protection, audit logging
- **Type Safety Complète** : TypeScript strict, validation Zod runtime
- **Progressive Enhancement** : Fonctionne sans JavaScript

## Documentation Technique

Pour la documentation technique complète de l'architecture, de la base de données, et des patterns de développement, consulter :

📋 **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Documentation technique complète

Cette documentation couvre :

- Architecture du système et patterns utilisés
- Structure de la base de données Supabase
- Système d'authentification et autorisation
- Gestion d'état et Server Actions
- Internationalisation et routing
- Intégrations externes (Stripe, Colissimo)
- Standards de code et tests

## Stack Technologique

### Frontend

- **Next.js 15** - Framework React avec App Router
- **React 19** - Bibliothèque UI avec Server Components
- **TypeScript 5** - Typage statique et sécurité
- **Tailwind CSS** - Framework CSS utilitaire
- **shadcn/ui** - Composants UI accessibles
- **Framer Motion** - Animations fluides
- **next-intl** - Internationalisation (FR, EN, DE, ES)

### Backend & Services

- **Supabase** - Base de données PostgreSQL et authentification
- **Stripe** - Traitement des paiements
- **Colissimo API** - Gestion des livraisons en France
- **Vercel** - Hébergement et déploiement

### Outils de Développement

- **Zustand** - Gestion d'état client
- **React Hook Form** - Gestion de formulaires
- **Zod** - Validation et typage runtime
- **Jest & Testing Library** - Tests unitaires
- **Playwright** - Tests end-to-end
- **ESLint & Prettier** - Qualité de code
- **Husky** - Git hooks

## Fonctionnalités

### 🛍️ E-commerce

- Catalogue produits avec catégories et filtres
- Panier persistant avec synchronisation multi-appareils
- Processus de commande optimisé
- Gestion des stocks en temps réel
- Support multi-devises (EUR prioritaire)

### 👤 Gestion Utilisateurs

- Authentification Supabase (email/mot de passe)
- Profils utilisateurs personnalisables
- Historique des commandes
- Gestion des adresses multiples
- Préférences et favoris

### 🔧 Administration

- Dashboard administrateur complet
- Gestion des produits et stocks
- Traitement des commandes
- Analytics et rapports
- Système de permissions granulaire

### 🚚 Livraison

- Intégration API Colissimo
- Points de retrait automatiques
- Calcul des frais de port
- Suivi des expéditions
- Support Chronopost et transporteurs

### 🌍 International

- Support multilingue complet
- Adaptation culturelle (formats dates, devises)
- SEO optimisé par langue
- Routing internationalisé

### 🔒 Sécurité

- Row Level Security (RLS) sur toutes les tables
- Audit automatique des actions sensibles
- Protection CSRF et XSS
- Chiffrement des données sensibles
- Conformité RGPD

## Structure du Projet

```
├── src/
│   ├── app/[locale]/          # Routes avec internationalisation
│   │   ├── (auth)/           # Routes d'authentification
│   │   ├── admin/            # Interface d'administration
│   │   ├── checkout/         # Processus de commande
│   │   └── shop/             # Pages e-commerce
│   ├── components/            # Composants React
│   │   ├── admin/            # Composants administration
│   │   ├── auth/             # Authentification
│   │   ├── common/           # Composants partagés
│   │   ├── features/         # Fonctionnalités métier
│   │   ├── forms/            # Formulaires
│   │   ├── layout/           # Mise en page
│   │   └── ui/               # Design system
│   ├── actions/              # Server Actions
│   ├── lib/                  # Utilitaires et services
│   │   ├── auth/             # Services d'authentification
│   │   ├── supabase/         # Clients de base de données
│   │   ├── stripe/           # Intégration paiements
│   │   └── storage/          # Gestion fichiers
│   ├── services/             # Logique métier
│   ├── stores/               # Stores Zustand
│   ├── types/                # Définitions TypeScript
│   └── i18n/                 # Fichiers de traduction
├── supabase/                 # Configuration Supabase
│   ├── migrations/           # Migrations de base de données
│   └── functions/            # Edge Functions
├── docs/                     # Documentation
├── scripts/                  # Scripts utilitaires
└── __tests__/                # Tests
```

## Scripts Disponibles

### Développement

```bash
npm run dev              # Serveur de développement
npm run build            # Build de production
npm run start            # Serveur de production
npm run typecheck        # Vérification TypeScript
```

### Qualité

```bash
npm run lint             # Analyse ESLint
npm run test             # Tests unitaires
npm run test:watch       # Tests en mode watch
npm run test:coverage    # Couverture de tests
```

### Utilitaires

```bash
npm run audit-roles      # Audit des rôles admin
npm run fix-admin-role   # Correction rôles admin
npm run analyze          # Analyse du bundle
```

## Configuration

### Variables d'Environnement

Créer un fichier `.env.local` :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Contribution

### Standards de Code

- TypeScript strict mode avec validation Zod
- ESLint + Prettier configurés avec hooks Git
- Tests requis pour nouvelles fonctionnalités
- Commits conventionnels en français
- Server Components par défaut

### Workflow

1. Fork du projet
2. Création branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Développement suivant les patterns existants
4. Tests et validation qualité (`npm run lint && npm run test`)
5. Pull Request vers `main`

## Support

- **Contact** : contact@herbisveritas.fr
- **Documentation** : [DOCUMENTATION.md](./DOCUMENTATION.md)

## Licence

Logiciel propriétaire. Tous droits réservés.

---

**Construit avec passion par l'équipe HerbisVeritas** 🌱
