# Guide du Développeur

## Architecture Technique

### Stack

- Next.js 15+ (App Router, Server Components)
- React 18.2+, TypeScript 5.x
- Supabase (auth, DB, RLS)
- Zustand 4.x, React Hook Form + Zod
- Tailwind CSS 3.x / shadcn/ui
- Framer Motion (animations)
- next-intl (i18n Fr/En)

## Structure du Projet

```
src/
├── app/                    # Routes de l'application
│   ├── [locale]/           # Routes internationalisées
│   └── admin/              # Routes protégées admin
├── components/
│   ├── ui/                 # Composants shadcn/ui
│   ├── primitives/         # Atomes UI maison
│   ├── shared/             # Blocs réutilisables
│   ├── layout/             # Gabarits de page
│   └── domain/             # Composants métier
├── lib/                    # Utilitaires, hooks, config
├── locales/                # Fichiers i18n
└── styles/                 # Fichiers de style globaux
```

## Composants UI

### Organisation

- **ui/**: Composants shadcn/ui installés via CLI
- **primitives/**: Atomes UI maison (ex: ErrorBoundary, Heading)
- **shared/**: Blocs réutilisables (ex: Breadcrumb, Modal)
- **layout/**: Structures de page (ex: Header, Footer)
- **domain/**: Composants métier (ex: ProductCard, CartDisplay)

## Bonnes Pratiques

### Règles Générales

- TypeScript strict activé
- Exports nommés uniquement
- Composants en PascalCase
- Tests unitaires pour toute nouvelle fonctionnalité
- Documentation à jour

### Conventions de Nommage

- Composants: `PascalCase`
- Fichiers: `kebab-case`
- Hooks personnalisés: `usePascalCase`
- Types/Interfaces: `TPascalCase` ou `IPascalCase`

### Internationalisation

- Tous les textes doivent utiliser next-intl
- Clés de traduction en `camelCase`
- Namespaces par fonctionnalité

## Démarrage Rapide

1. Cloner le dépôt
2. Installer les dépendances: `npm install`
3. Copier `.env.example` vers `.env.local`
4. Configurer les variables d'environnement
5. Démarrer le serveur: `npm run dev`

## Tests

```bash
# Lancer les tests unitaires
npm test

# Lancer les tests E2E
npm run test:e2e
```

## Déploiement

Le déploiement est automatisé via GitHub Actions. Les branches sont déployées comme suit:

- `main` → Production
- `staging` → Préproduction
- `feature/*` → Prévisualisation (si configuré)
