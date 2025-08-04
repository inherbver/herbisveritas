# Guide de Démarrage Rapide

Guide complet pour configurer et lancer In Herbis Veritas en mode développement en moins de 15 minutes.

## Prérequis

### Outils Requis
- **Node.js** 18.17+ (LTS recommandé)
- **npm** 9+ ou **yarn** 1.22+
- **Git** pour le clonage du repository
- **VS Code** (recommandé) avec extensions TypeScript

### Comptes et Services
- **Supabase** - Base de données et authentification
- **Stripe** - Paiements (optionnel pour démarrer)
- **Cloudflare** - CDN et domaines (optionnel)

## Installation Express (5 minutes)

### 1. Clonage et Dépendances
```bash
# Cloner le repository
git clone https://github.com/votre-org/herbis-veritas.git
cd herbis-veritas

# Installer les dépendances
npm install

# Ou avec yarn
yarn install
```

### 2. Configuration Environnement
```bash
# Copier le template d'environnement
cp .env.example .env.local

# Éditer les variables d'environnement
nano .env.local
```

### 3. Variables Essentielles
```env
# === CONFIGURATION MINIMALE POUR DÉMARRER ===

# Base URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clé de chiffrement (générer avec: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-character-hex-key

# === OPTIONNEL POUR DÉMARRER ===

# Stripe (pour e-commerce complet)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (pour notifications)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@votredomaine.com
```

### 4. Lancement Développement
```bash
# Démarrer le serveur de développement
npm run dev

# Application disponible sur http://localhost:3000
```

## Configuration Supabase (10 minutes)

### 1. Création Projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Récupérer l'URL et les clés API
4. Configurer dans `.env.local`

### 2. Base de Données
```bash
# Si Supabase CLI installé
supabase db reset

# Ou manuellement : exécuter les migrations dans l'ordre
# 1. 20250119120000_add_role_based_admin_system.sql
# 2. 20250623170000_initial_profiles_schema.sql
# 3. 20250623180000_initial_product_catalog_schema.sql
# 4. 20250623190000_initial_cart_schema.sql
# 5. 20250623191500_initial_order_schema.sql
# 6. 20250704101800_create_audit_logs_table.sql
# 7. 20250708102000_create_addresses_table.sql
# 8. 20250710110201_add_shipping_tables.sql
```

### 3. Authentification Supabase
Dans le dashboard Supabase :
1. **Authentication** → **Settings** → **Auth Providers**
2. Activer **Email** auth
3. Configurer **Site URL** : `http://localhost:3000`
4. Ajouter **Redirect URLs** : `http://localhost:3000/auth/callback`

### 4. Row Level Security
```sql
-- Activer RLS sur toutes les tables principales
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

## Première Utilisation

### 1. Créer un Compte Admin
```bash
# Via l'interface web
# 1. Aller sur http://localhost:3000/auth/signup
# 2. Créer un compte avec votre email
# 3. Confirmer l'email via Supabase

# Promouvoir en admin via SQL
# Dans Supabase SQL Editor :
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'votre-email@example.com';
```

### 2. Ajouter des Données de Test
```sql
-- Créer quelques catégories
INSERT INTO categories (name, slug, description) VALUES
  ('Soins Visage', 'soins-visage', 'Produits pour le soin du visage'),
  ('Soins Corps', 'soins-corps', 'Produits pour le soin du corps'),
  ('Huiles Essentielles', 'huiles-essentielles', 'Huiles essentielles pures');

-- Créer quelques produits
INSERT INTO products (name, slug, price, stock_quantity, category, description, is_active) VALUES
  ('Crème Hydratante Bio', 'creme-hydratante-bio', 24.90, 15, 'soins-visage', 'Crème hydratante certifiée bio', true),
  ('Huile d''Argan Pure', 'huile-argan-pure', 18.50, 8, 'soins-corps', 'Huile d''argan 100% pure et bio', true),
  ('Lavande Vraie', 'lavande-vraie', 12.00, 25, 'huiles-essentielles', 'Huile essentielle de lavande vraie', true);
```

### 3. Tester les Fonctionnalités
1. **Navigation** → Aller sur `/boutique`
2. **Ajout panier** → Ajouter des produits
3. **Authentification** → Se connecter/déconnecter
4. **Administration** → Accéder à `/admin`

## Structure du Projet

### Arborescence Principale
```
src/
├── app/[locale]/              # Pages Next.js avec i18n
│   ├── (shop)/               # Pages boutique
│   ├── admin/                # Panel d'administration
│   ├── auth/                 # Authentification
│   └── api/                  # API routes
├── components/               # Composants React
│   ├── domain/              # Composants métier
│   ├── ui/                  # shadcn/ui
│   └── shared/              # Composants partagés
├── actions/                 # Server Actions Next.js
├── lib/                     # Utilitaires et services
│   ├── supabase/           # Clients Supabase
│   ├── validators/         # Schémas Zod
│   └── core/               # Logique métier
├── stores/                  # État global Zustand
└── types/                   # Types TypeScript
```

### Points d'Entrée Clés
- **Page d'accueil** : `app/[locale]/page.tsx`
- **Boutique** : `app/[locale]/(shop)/boutique/page.tsx`
- **Panier** : `app/[locale]/(shop)/panier/page.tsx`
- **Admin** : `app/[locale]/admin/page.tsx`
- **API** : `app/api/` (webhooks, uploads)

## Configuration IDE

### VS Code Extensions Recommandées
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "supabase.supabase-vscode",
    "PKief.material-icon-theme"
  ]
}
```

### Configuration Prettier (déjà incluse)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "tabWidth": 2,
  "printWidth": 80
}
```

### Configuration ESLint (déjà incluse)
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

## Commandes Utiles

### Développement
```bash
# Démarrer en mode développement
npm run dev

# Build de production
npm run build

# Démarrer production locale
npm start

# Linter et formatage
npm run lint
npm run lint:fix
```

### Base de Données
```bash
# Générer types TypeScript depuis Supabase
npm run db:types

# Reset base de données (si Supabase CLI)
supabase db reset

# Appliquer migrations
supabase db push
```

### Tests
```bash
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Tests avec coverage
npm run test:coverage

# Test spécifique
npm test -- cartActions.test.ts
```

## Dépannage Rapide

### Problèmes Courants

#### 1. Erreur de Connexion Supabase
```
Error: Failed to connect to Supabase
```

**Solutions :**
- Vérifier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vérifier que le projet Supabase est bien démarré
- Tester la connexion : `curl https://votre-projet.supabase.co/rest/v1/`

#### 2. Erreur RLS (Row Level Security)
```
new row violates row-level security policy
```

**Solutions :**
- Vérifier que les politiques RLS sont créées
- S'assurer que l'utilisateur est authentifié
- Vérifier les permissions dans Supabase Auth

#### 3. Erreur Compilation TypeScript
```
Module not found: Can't resolve '@/...'
```

**Solutions :**
- Vérifier `tsconfig.json` pour l'alias `@`
- Redémarrer le serveur de développement
- Vider cache : `rm -rf .next && npm run dev`

#### 4. Erreur Stripe (optionnel)
```
No API key provided
```

**Solutions :**
- Configurer `STRIPE_SECRET_KEY` dans `.env.local`
- Pour les tests, utiliser les clés de test Stripe
- Vérifier que les webhooks sont configurés

### Logs de Debug

#### Activer les Logs Détaillés
```env
# Dans .env.local
DEBUG=true
NODE_ENV=development

# Logs Supabase
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

#### Vérifier les Logs
```bash
# Logs serveur Next.js
tail -f .next/server.log

# Logs base de données Supabase
# Via dashboard Supabase → Logs → API
```

## Ressources et Documentation

### Documentation Interne
- **[Architecture](../architecture/overview.md)** - Vue d'ensemble technique
- **[E-commerce](../features/e-commerce.md)** - Système de boutique
- **[Sécurité](../architecture/security.md)** - Architecture de sécurité
- **[Server Actions](../development/server-actions.md)** - API de référence

### Documentation Externe
- **[Next.js 15](https://nextjs.org/docs)** - Framework
- **[Supabase](https://supabase.com/docs)** - Backend
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Composants

### Support
- **Issues GitHub** : [Signaler un bug](https://github.com/votre-org/herbis-veritas/issues)
- **Discussions** : [Poser une question](https://github.com/votre-org/herbis-veritas/discussions)
- **Email** : `dev@herbisveritas.com`

## Prochaines Étapes

### Après Installation
1. **Explorer l'interface** utilisateur et admin
2. **Lire la documentation** architecture
3. **Comprendre le système** de panier
4. **Configurer Stripe** pour les paiements
5. **Personnaliser le design** selon vos besoins

### Développement
1. **Créer une branche** : `git checkout -b feature/ma-feature`
2. **Suivre les conventions** de code
3. **Écrire des tests** pour les nouvelles features
4. **Documenter** les changements importants

### Déploiement
1. **Configuration production** → Voir [Deployment Guide](./deployment.md)
2. **Variables d'environnement** production
3. **Configuration DNS** et SSL
4. **Monitoring** et alertes

---

**Temps total d'installation** : ~15 minutes  
**Difficulté** : Intermédiaire  
**Prérequis** : Connaissances JavaScript/TypeScript de base

🚀 **Félicitations !** Votre environnement In Herbis Veritas est prêt pour le développement.