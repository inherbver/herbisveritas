# ⚠️ DOCUMENTATION PARTIELLEMENT OBSOLÈTE

**Mise à jour nécessaire :** Ce document contient des informations valides sur l'implémentation des fonctionnalités admin, mais les aspects de gestion des rôles et permissions doivent être mis à jour.

**Pour la gestion des rôles et permissions :** Voir [ADMIN_ROLE_MANAGEMENT.md](./ADMIN_ROLE_MANAGEMENT.md)

**Ce document reste valide pour :**

- ✅ Architecture technique des pages admin
- ✅ Structure des fichiers et composants
- ✅ Patterns de développement (CRUD, forms, etc.)

**À mettre à jour :**

- ⚠️ Utiliser `checkAdminRole()` au lieu de `checkUserPermission()`
- ⚠️ Permissions basées sur le nouveau système unifié

---

# Plan d'Implémentation : Gestion des Produits (CRUD) dans le Panneau d'Administration

**1. Objectif**

Mettre en place une interface d'administration complète pour la gestion des produits (CRUD : Create, Read, Update, Delete), incluant la gestion des traductions associées.

**2. Architecture Technique**

- **Framework**: Next.js 14+ (App Router)
- **Base de données**: Supabase (PostgreSQL)
- **Mutations de données**: Next.js Server Actions
- **Bibliothèque UI**: `shadcn/ui`
- **Gestion de formulaires**: `react-hook-form` avec `zod` pour la validation
- **Authentification & Autorisation**: Supabase Auth + logique de permission existante (`checkUserPermission`)

**3. Structure des Fichiers**

```
src/
└── app/
    └── [locale]/
        └── admin/
            └── products/
                ├── page.tsx                 # Page principale (liste des produits)
                ├── data-table.tsx           # Composant DataTable réutilisable
                ├── columns.tsx              # Définition des colonnes pour la DataTable
                ├── actions.ts               # Server Actions (create, update, delete)
                └── product-form.tsx         # Formulaire de création/modification
```

**4. Plan d'Implémentation Détaillé**

**Étape 1 : Affichage des Produits (Read)**

1.  **Créer la Server Action `getProductsForAdmin`**:
    - Dans `src/lib/supabase/queries/products.ts`, créer une nouvelle fonction qui récupère tous les produits et toutes leurs traductions, sans filtrer par locale.
    - Cette fonction retournera une liste de produits avec un tableau de traductions imbriqué.

2.  **Définir les colonnes de la `DataTable` (`columns.tsx`)**:
    - Utiliser le composant `DataTable` de `shadcn/ui`.
    - Colonnes à afficher : `ID`, `Nom (FR)`, `Nom (EN)`, `Prix`, `Stock`, `Statut` (Nouveau, Promotion), `Date de création`.
    - Ajouter une colonne "Actions" avec un `DropdownMenu` pour "Modifier" et "Supprimer".

3.  **Créer le composant `data-table.tsx`**:
    - Implémenter la `DataTable` réutilisable en se basant sur la documentation `shadcn/ui`.
    - Inclure la pagination, le filtrage (par nom) et le tri.

4.  **Créer la page principale (`page.tsx`)**:
    - Utiliser la fonction `getProductsForAdmin` pour récupérer les données.
    - Passer les données et les colonnes au composant `DataTable`.
    - Ajouter un bouton "Ajouter un produit" qui ouvrira le formulaire de création.

**Étape 2 : Création et Modification (Create / Update)**

1.  **Définir le schéma de validation avec `zod`**:
    - Créer un schéma qui valide tous les champs de la table `products` et `product_translations`.
    - Le schéma doit gérer un tableau de traductions (au moins `fr` et `en`).

2.  **Créer le formulaire réutilisable (`product-form.tsx`)**:
    - Utiliser `react-hook-form` et le résolveur `zod`.
    - Le formulaire contiendra des champs pour les propriétés principales du produit (prix, stock, slug, etc.).
    - Utiliser des onglets (`Tabs` de `shadcn/ui`) pour gérer les champs traduisibles (nom, description) pour chaque langue.

3.  **Créer les Server Actions (`actions.ts`)**:
    - `createProduct(formData: FormData)`:
      - Valider les données avec le schéma `zod`.
      - Insérer les données dans la table `products`.
      - Insérer les traductions dans la table `product_translations`.
      - Utiliser `revalidatePath('/admin/products')` pour rafraîchir la liste.
    - `updateProduct(productId: string, formData: FormData)`:
      - Même logique que `createProduct`, mais avec une mise à jour (`.update()`, `.upsert()` pour les traductions).
      - Sécuriser chaque action en vérifiant les permissions de l'admin.

4.  **Intégrer le formulaire**:
    - Le bouton "Ajouter un produit" ouvrira un `Dialog` (`shadcn/ui`) contenant `product-form.tsx` en mode "création".
    - Le bouton "Modifier" dans la `DataTable` ouvrira le même `Dialog` en mode "modification", pré-rempli avec les données du produit.

**Étape 3 : Suppression (Delete)**

1.  **Créer la Server Action `deleteProduct(productId: string)`**:
    - Vérifier les permissions de l'admin.
    - Supprimer le produit de la base de données (gérer les contraintes de clé étrangère).
    - Utiliser `revalidatePath('/admin/products')`.

2.  **Intégrer la suppression**:
    - L'action "Supprimer" dans le `DropdownMenu` de la `DataTable` déclenchera cette action.
    - Utiliser un `AlertDialog` (`shadcn/ui`) pour demander une confirmation avant la suppression définitive.

**5. Sécurité**

- Toutes les Server Actions dans `actions.ts` devront commencer par une vérification des permissions de l'utilisateur via `checkUserPermission("admin:access")`.
- La page `/admin/products` sera protégée par la même logique au niveau du layout ou de la page elle-même.

Ce plan fournit une feuille de route claire pour un développement structuré et robuste.
