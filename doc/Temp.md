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

----

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

```

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
