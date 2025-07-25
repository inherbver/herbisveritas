# MAGAZINE.md

Documentation complète du système Magazine avec TipTap pour Herbis Veritas.

## Vue d'ensemble

Le système Magazine est une extension complète de la plateforme e-commerce qui permet la création, gestion et publication d'articles de blog avec un éditeur riche TipTap. Il s'intègre parfaitement dans l'architecture Next.js 15 + Supabase existante et est **entièrement implémenté et fonctionnel**.

## Architecture

### Structure des données

Le système utilise 4 tables principales dans PostgreSQL :

```sql
-- Table des catégories d'articles
categories (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR DEFAULT '#6B7280', -- Code couleur hex
  created_at, updated_at TIMESTAMPTZ
)

-- Table des articles
articles (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL, -- Contenu TipTap JSON
  content_html TEXT, -- Version HTML pour affichage
  featured_image VARCHAR,
  status VARCHAR DEFAULT 'draft' CHECK (draft|published|archived),
  published_at TIMESTAMPTZ,
  author_id UUID → profiles(id),
  category_id UUID → categories(id),
  view_count INTEGER DEFAULT 0,
  reading_time INTEGER, -- Minutes calculées automatiquement
  seo_title VARCHAR,
  seo_description VARCHAR,
  created_at, updated_at TIMESTAMPTZ
)

-- Table des tags
tags (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMPTZ
)

-- Table de liaison many-to-many
article_tags (
  article_id UUID → articles(id),
  tag_id UUID → tags(id),
  PRIMARY KEY (article_id, tag_id)
)
```

### Permissions et sécurité

Le système s'appuie sur le système de rôles existant avec les permissions suivantes :

- **`user`** : Lecture des articles publiés uniquement
- **`editor`** : Création, modification et gestion complète des articles
- **`admin`** : Gestion complète + suppression d'articles

**Politiques RLS configurées** :
- Articles publiés visibles par tous
- Brouillons/archivés visibles uniquement par les éditeurs/admins
- Seuls les éditeurs/admins peuvent créer/modifier (`content:create`, `content:update`)
- Publication/dépublication nécessite `content:publish`/`content:unpublish`
- Suppression nécessite `content:delete`

## Structure du code

### Types TypeScript (`/src/types/magazine.ts`) ✨ **ENRICHIS**

```typescript
// Types de base (existants)
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: TipTapContent; // JSON TipTap avec type strict
  content_html: string | null;
  featured_image: string | null;
  status: string | null;
  published_at: string | null;
  author_id: string;
  category_id: string | null;
  view_count: number | null;
  reading_time: number | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ✨ NOUVEAUX TYPES POUR LES COMPOSANTS UI
export interface ArticleCardProps {
  article: ArticleDisplay;
  variant?: 'default' | 'compact' | 'featured';
}

export interface ArticleMetadataProps {
  author?: Author;
  publishedDate: string;
  readingTime?: number | null;
  viewCount?: number | null;
  className?: string;
  variant?: 'default' | 'compact';
}

export interface TagListProps {
  tags: Tag[];
  maxVisible?: number;
  variant?: 'default' | 'compact' | 'badges';
  onTagClick?: (tag: Tag) => void;
  className?: string;
}

export interface MagazineHeroProps {
  title: string;
  description: string;
  categories?: Category[];
  currentCategory?: string;
  backgroundImage?: string;
}

// ✨ TYPES POUR LES PAGES ET PARAMÈTRES
export interface MagazinePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<MagazineSearchParams>;
}

export interface MagazineSearchParams {
  page?: string;
  category?: string;
  search?: string;
  tag?: string;
}

// Types étendus avec relations (améliorés)
export interface ArticleDisplay extends Article {
  author?: Author;
  category?: Category;
  tags?: Tag[];
}
```

### Server Actions (`/src/actions/magazineActions.ts`)

**Fonctions principales implementées** :

1. **Gestion des articles** :
   - `createArticle(formData: ArticleFormData)` - Création avec validation complète
   - `updateArticle(id: string, formData: ArticleFormData)` - Mise à jour
   - `deleteArticle(id: string)` - Suppression (admins uniquement)

2. **Workflow de publication** :
   - `changeArticleStatus(articleId, newStatus)` - Changement de statut unitaire
   - `bulkChangeArticleStatus(articleIds, newStatus)` - Changement de statut en lot

3. **Gestion des taxonomies** :
   - `createCategory(data)` - Création de catégories
   - `createTag(data)` - Création de tags

4. **✨ Upload d'images** (Janvier 2025) :
   - `uploadMagazineImage(formData: FormData)` - Upload d'images avec validation
   - Support des formats JPEG, PNG, WebP, GIF (max 4MB)
   - Stockage dans le bucket Supabase "magazine" avec politiques RLS
   - Génération automatique d'URLs publiques
   - Validation des permissions `content:create`

**Fonctionnalités intégrées** :
- Génération automatique des slugs avec normalisation Unicode
- Calcul automatique du temps de lecture (200 mots/min)
- Conversion automatique JSON TipTap → HTML
- Validation de l'unicité des slugs
- Gestion automatique des relations tags/articles
- Validation des permissions pour chaque action
- Validation du contenu pour la publication

### Requêtes optimisées (`/src/lib/magazine/queries.ts`)

**Fonctions de lecture implementées** :
- `getArticles(filters, page, limit)` - Liste paginée avec filtres avancés
- `getArticleBySlug(slug)` - Article individuel avec toutes relations
- `getArticleById(id)` - Article par ID avec relations
- `getPublishedArticles(limit)` - Derniers articles publiés
- `getCategories()`, `getTags()` - Gestion des taxonomies
- `getCategoryBySlug(slug)`, `getTagBySlug(slug)` - Accès par slug
- `getArticleStats()` - Statistiques complètes du contenu

**Optimisations implementées** :
- Requêtes avec relations pré-chargées via `select()`
- Pagination intégrée avec comptage précis
- Filtres avancés (statut, catégorie, recherche full-text, tags, auteur)
- Incrémentation automatique du compteur de vues
- Vérification des permissions intégrée

### Utilitaires (`/src/lib/magazine/`)

1. **Convertisseur HTML (`html-converter.ts`)** :
   - `convertTipTapToHTML(content)` - Conversion JSON → HTML avec styles Tailwind
   - `extractPlainText(content)` - Extraction du texte brut
   - `calculateReadingTime(content)` - Calcul du temps de lecture
   - `extractExcerpt(content, maxLength)` - Génération d'extraits automatiques
   - Fallback de conversion en cas d'erreur TipTap

2. **Utilitaires de publication (`publication-utils.ts`)** :
   - `getPublicationPermissions()` - Vérification des permissions complètes
   - `canPerformPublicationAction(action, article)` - Validation des transitions d'état
   - `validateArticleForPublication(article)` - Validation avant publication
   - `getValidStatusTransitions(currentStatus)` - États possibles
   - `getPublicationActionMessage(action, title)` - Messages utilisateur

## Composants front-end

### Composants d'édition (`/src/components/magazine/`)

1. **`TipTapEditor`** (`tiptap-editor.tsx`) :
   - Éditeur riche complet avec toolbar
   - Extensions : StarterKit, Image, Link, TextAlign, Highlight, etc.
   - Fonctions utilitaires : `generateHTMLFromJSON`, `getPlainTextFromJSON`
   - Thème personnalisé Herbis Veritas

2. **`TipTapViewer`** (`tiptap-viewer.tsx`) :
   - Visualiseur lecture seule pour l'affichage
   - Composant `ArticleExcerpt` pour les résumés
   - Hooks : `useExtractPlainText`, `useExtractExcerpt`

3. **`AutoSaveEditor`** (`auto-save-editor.tsx`) :
   - Sauvegarde automatique des brouillons
   - Hook `useRestoreDraft` pour récupération

4. **`ImageUpload`** (`image-upload.tsx`) :
   - Upload d'images intégré à l'éditeur

### Nouveaux composants modulaires (✨ **Janvier 2025**)

5. **`ArticleCard`** (`article-card.tsx`) :
   - Card d'article réutilisable avec variants (`default`, `compact`, `featured`)
   - Images responsives avec placeholder élégant
   - Hover effects subtils et transitions fluides
   - Utilise les composants `ArticleMetadata` et `TagList`
   - Support complet des relations (auteur, catégorie, tags)

6. **`ArticleMetadata`** (`article-metadata.tsx`) :
   - Composant réutilisable pour afficher les métadonnées d'articles
   - Variants `default` et `compact`
   - Affiche : auteur, date de publication, temps de lecture, nombre de vues
   - Balises sémantiques `<time>` pour l'accessibilité
   - Icônes cohérentes avec Lucide React

7. **`TagList`** (`tag-list.tsx`) :
   - Liste de tags intelligente avec gestion du `maxVisible`
   - Variants `default`, `compact`, `badges`
   - Support onClick personnalisé pour interactions
   - Navigation automatique vers `/magazine/tag/[slug]`
   - Compteur des tags supplémentaires (+X)

8. **`MagazineHero`** (`magazine-hero.tsx`) :
   - Section hero moderne inspirée de [lesvilainescuriosites.fr](https://www.lesvilainescuriosites.fr)
   - Navigation par catégories intégrée style "pills"
   - Support image de fond optionnelle avec overlay
   - Gradients subtils et typographie hiérarchisée
   - Responsive design avec breakpoints adaptés

### Pages publiques

1. **Page magazine (`/src/app/[locale]/magazine/page.tsx`)** ✨ **REDESIGNÉE** :
   - **Fonctionnalités** : Liste des articles avec pagination, recherche full-text, navigation par catégories
   - **Design moderne** : Hero section inspirée de [lesvilainescuriosites.fr](https://www.lesvilainescuriosites.fr)
   - **Navigation intégrée** : Filtres par catégories dans le hero avec style "pills"
   - **Composants modulaires** : `MagazineHero`, `ArticleCard`, `ArticleMetadata`, `TagList`
   - **Architecture** : Types TypeScript stricts (élimination des `any`), composants réutilisables
   - **SEO** : Métadonnées complètes, données structurées JSON-LD, OpenGraph/Twitter
   - **Performance** : Suspense optimisé, skeletons adaptés au nouveau design, images responsives

2. **Page détail article (`/src/app/[locale]/magazine/[slug]/page.tsx`)** :
   - Affichage complet avec `TipTapViewer`
   - Métadonnées SEO automatiques
   - Compteur de vues automatique
   - Navigation par tags/catégories

3. **Pages filtres** :
   - `/magazine/category/[slug]` - Articles par catégorie
   - `/magazine/tag/[slug]` - Articles par tag

### Interface d'administration

1. **Dashboard magazine (`/src/app/[locale]/admin/magazine/page.tsx`)** :
   - **Vue d'ensemble** : Statistiques en temps réel (total, publiés, brouillons, archivés)
   - **Gestion** : Liste des articles avec filtres de statut
   - **Actions** : Création, modification, visualisation
   - **UI** : Cards responsive, pagination, loading states

2. **Éditeur d'articles** :
   - `/admin/magazine/new` - Création
   - `/admin/magazine/[id]/edit` - Modification
   - Intégration complète TipTap avec sauvegarde auto

## Fonctionnalités implémentées

### ✅ Gestion complète des articles

1. **Cycle de vie complet** :
   - États : `draft` → `published` → `archived`
   - Validation avant publication (titre, contenu, slug)
   - Gestion des dates de publication automatique

2. **Métadonnées automatiques** :
   - Slug généré avec normalisation Unicode et validation d'unicité
   - Temps de lecture calculé (200 mots/min)
   - HTML généré automatiquement depuis le JSON TipTap
   - Extraits automatiques si non fournis

3. **SEO intégré** :
   - Titre SEO personnalisable
   - Meta description personnalisable
   - Slugs optimisés pour les URL
   - Données structurées JSON-LD
   - Balises OpenGraph et Twitter

### ✅ Système de taxonomie

1. **Catégories** :
   - Une catégorie par article (optionnelle)
   - Couleur personnalisable pour l'UI (`#6B7280` par défaut)
   - Navigation par catégorie implementée

2. **Tags** :
   - Relation many-to-many avec articles
   - Tags réutilisables entre articles
   - Navigation par tag implementée

### ✅ Fonctionnalités avancées

1. **Statistiques** :
   - Compteur de vues automatique par article
   - Dashboard avec stats globales (total, publiés, brouillons, archivés)
   - Temps de lecture affiché

2. **Recherche et filtres** :
   - Recherche full-text dans titre et extrait (opérateur `ilike`)
   - Filtres par statut, catégorie, auteur, tags
   - Pagination performante côté serveur

3. **Workflow éditorial** :
   - Permissions granulaires par action
   - Validation avant publication
   - Actions en lot (changement de statut multiple)
   - Messages de confirmation utilisateur

## Intégration avec l'existant

### ✅ Système d'authentification

Intégration complète avec le système de permissions existant :

```typescript
// Permissions vérifiées dans chaque action
const hasCreatePermission = await checkUserPermission("content:create");
const hasPublishPermission = await checkUserPermission("content:publish");
```

**Permissions utilisées** :
- `content:create` - Création d'articles/catégories/tags
- `content:update` - Modification, accès aux brouillons
- `content:delete` - Suppression d'articles
- `content:publish` - Publication d'articles
- `content:unpublish` - Dépublication d'articles

### ✅ Interface d'administration

Intégration parfaite dans le dashboard admin existant :
- Route `/admin/magazine` ajoutée au menu de navigation
- Utilisation des composants shadcn/ui existants
- Cohérence avec le design system Herbis Veritas

### ✅ Internationalisation

Compatible avec le système next-intl existant :
- Traductions dans `/src/i18n/messages/[locale]/MagazinePage.json`
- Routes localisées : `/{locale}/magazine`
- Interface admin multilingue avec `getTranslations()`

### ✅ Performance et SEO

- **Images** : Optimisation Next.js avec lazy loading
- **Métadonnées** : Generation dynamique avec `generateMetadata()`
- **Cache** : Revalidation automatique des pages avec `revalidatePath()`
- **SSR** : Server Components pour le SEO optimal

## Configuration et données

### ✅ Migrations appliquées

Les tables et politiques RLS sont opérationnelles :
- Tables : `articles`, `categories`, `tags`, `article_tags`
- Index : Sur `slug`, `status`, `published_at`, etc.
- Contraintes : Validation des statuts, unicité des slugs
- RLS : Politiques de sécurité complètes

### ✅ Types TypeScript

Types synchronisés avec la base de données via Supabase CLI.

### ✅ Données de test

Catégories créées par défaut :
- Actualités, Tutoriels, Opinion, Lifestyle avec couleurs distinctes

Tags créés par défaut :
- Développement, Design, Web, Mobile, etc.

## Utilisation

### Création d'un article

```typescript
import { createArticle } from '@/actions/magazineActions';

const formData: ArticleFormData = {
  title: "Guide complet des huiles essentielles",
  slug: "guide-huiles-essentielles", // Généré auto si omis
  excerpt: "Découvrez les propriétés et usages des huiles essentielles...",
  content: tiptapJsonContent, // Contenu JSON de l'éditeur
  featured_image: "/images/huiles-essentielles.jpg",
  status: "draft",
  category_id: "uuid-actualites",
  tag_ids: ["uuid-bien-etre", "uuid-naturel"],
  seo_title: "Guide huiles essentielles - Herbis Veritas",
  seo_description: "Tout savoir sur les huiles essentielles : propriétés, usages et conseils d'utilisation."
};

const result = await createArticle(formData);
if (result.success) {
  console.log("Article créé:", result.data);
} else {
  console.error("Erreur:", result.error);
}
```

### Récupération d'articles

```typescript
import { getArticles, getArticleBySlug } from '@/lib/magazine/queries';

// Liste paginée avec filtres
const result = await getArticles(
  { 
    status: 'published', 
    category_id: 'uuid-actualites',
    search: 'huiles essentielles'
  },
  1, // page
  10 // limite
);
// result: { articles: ArticleDisplay[], pagination: ArticlePagination }

// Article individuel
const article = await getArticleBySlug('guide-huiles-essentielles');
// Article complet avec author, category, tags
```

### Workflow de publication

```typescript
import { changeArticleStatus } from '@/actions/magazineActions';

// Publication d'un article
const result = await changeArticleStatus('article-id', 'published');
if (result.success) {
  console.log(result.message); // "L'article a été publié avec succès."
}

// Validation automatique avant publication
// - Titre présent
// - Contenu présent  
// - Slug valide (format: a-z0-9-)
// - Permissions utilisateur
```

## Statut actuel

### ✅ **ENTIÈREMENT IMPLÉMENTÉ ET FONCTIONNEL**

**Phase 1 : Fondations** ✅
- [x] Structure de base de données avec RLS
- [x] Types TypeScript complets
- [x] Server Actions avec validation
- [x] Requêtes optimisées avec relations

**Phase 2 : Éditeur TipTap** ✅
- [x] Installation et configuration TipTap
- [x] Composant éditeur complet (`TipTapEditor`)
- [x] Composant visualiseur (`TipTapViewer`)
- [x] Upload d'images intégré (`ImageUpload`)
- [x] Sauvegarde automatique (`AutoSaveEditor`)

**Phase 3 : Interface d'administration** ✅
- [x] Dashboard magazine avec statistiques
- [x] Liste des articles avec filtres
- [x] Formulaires création/modification
- [x] Gestion workflow de publication
- [x] Actions en lot

**Phase 4 : Pages publiques** ✅
- [x] Page listing des articles avec pagination
- [x] Page détail d'article optimisée SEO
- [x] Navigation par catégories et tags
- [x] Recherche full-text et filtres
- [x] Données structurées JSON-LD

**Phase 5 : Fonctionnalités avancées** ✅
- [x] Statistiques et analytics de base
- [x] SEO complet (métadonnées, Open Graph, Twitter)
- [x] Performance optimisée (Suspense, lazy loading)
- [x] Responsive design complet
- [x] Internationalisation

**✨ Phase 6 : Refactoring et amélioration UI** ✅ **(Janvier 2025)**
- [x] **Analyse du design** moderne via Playwright sur [lesvilainescuriosites.fr](https://www.lesvilainescuriosites.fr)
- [x] **Types TypeScript stricts** - Élimination de tous les `any` dans la page magazine
- [x] **Composants modulaires** - `ArticleCard`, `ArticleMetadata`, `TagList`, `MagazineHero`
- [x] **Architecture cohérente** - Réutilisation des composants existants
- [x] **Hero section moderne** - Navigation par catégories intégrée style "pills"
- [x] **Cards d'articles optimisées** - Variants, hover effects, images responsives
- [x] **Système d'upload d'images** - Intégration complète dans l'éditeur d'articles
- [x] **Sémantique HTML** - Balises appropriées (`<header>`, `<article>`, `<time>`, etc.)
- [x] **Performance** - Skeletons adaptés, Suspense optimisé

## Prochaines améliorations possibles

### Futures phases (non critiques)
- [ ] Commentaires avec modération
- [ ] Partage social avancé
- [ ] Newsletter intégrée
- [ ] Analytics détaillées (Google Analytics, temps de lecture réel)
- [ ] Système de révisions d'articles
- [ ] Planification de publication
- [ ] Export/import d'articles
- [ ] API REST publique

## Notes techniques

### Performance
- **Index DB** : Sur `status`, `published_at`, `author_id`, `category_id`, `slug`
- **Requêtes** : Relations pré-chargées, pagination côté serveur
- **Cache** : Revalidation automatique avec `revalidatePath()`
- **Images** : Optimisation Next.js Image avec lazy loading

### Sécurité
- **RLS** : Toutes les tables protégées par des politiques
- **Permissions** : Validation granulaire sur chaque action  
- **Sanitisation** : Slugs automatiquement nettoyés
- **Audit** : Actions loggées via la table `audit_logs` existante

### Maintenance
- **Triggers** : `updated_at` automatique
- **Contraintes** : Validation au niveau base de données
- **Types** : Synchronisation automatique Supabase ↔ TypeScript
- **Erreurs** : Gestion robuste avec messages utilisateur

---

**Documentation mise à jour le** : 25 janvier 2025  
**Version** : 3.0 - Système complet + UI moderne  
**Statut** : ✅ **ENTIÈREMENT FONCTIONNEL - PRÊT POUR PRODUCTION**

## ✨ **Nouveautés Version 3.0 (Janvier 2025)**

### Architecture modernisée
- **Types TypeScript stricts** - Remplacement de tous les `any` par des types spécifiques
- **Composants modulaires** - Architecture component-first réutilisable
- **Performance optimisée** - Skeletons et Suspense boundaries adaptés

### Design inspiré de références modernes
- **Hero section** élégante avec navigation intégrée
- **Cards d'articles** avec variants (`default`, `compact`, `featured`)
- **Micro-interactions** subtiles (hover effects, transitions)
- **Responsive design** adapté mobile-first

### Système d'upload d'images complet
- **Intégration éditeur** - Upload direct dans TipTap avec `MagazineImageUploadField`
- **Validation robuste** - Types, taille (4MB), formats (JPEG/PNG/WebP/GIF)
- **Stockage sécurisé** - Bucket Supabase avec politiques RLS appropriées
- **Interface utilisateur** - Drag & drop, preview, gestion d'erreurs

### Composants réutilisables
- **`ArticleCard`** - Card moderne avec variants et métadonnées intégrées
- **`ArticleMetadata`** - Affichage cohérent auteur/date/lecture/vues
- **`TagList`** - Liste intelligente avec compteur et variants
- **`MagazineHero`** - Section hero avec navigation par catégories

Le système Magazine est maintenant **à la pointe des standards modernes** avec une architecture solide, un design élégant et une expérience utilisateur optimale. Il peut être utilisé immédiatement pour créer, gérer et publier des articles sur la plateforme Herbis Veritas.