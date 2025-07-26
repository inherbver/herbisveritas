# STORAGE.md

Documentation du système de stockage et d'upload de fichiers pour Herbis Veritas.

## Vue d'ensemble

Le système de stockage utilise **Supabase Storage** avec une architecture centralisée pour l'upload d'images, implémentée en janvier 2025 pour éliminer la duplication de code et améliorer la maintenabilité.

## Architecture centralisée

### Localisation

```
src/lib/storage/
├── image-upload.ts          # Fonction centralisée + exports publics
└── __tests__/
    └── image-upload.test.ts # Tests unitaires du système core
```

### Fonction core : `uploadImageCore`

**Signature :**

```typescript
async function uploadImageCore(
  formData: FormData,
  config: BucketConfig
): Promise<UploadImageResult>;
```

**Configuration par bucket :**

```typescript
interface BucketConfig {
  bucket: "products" | "magazine";
  permission: AppPermission;
  usePermissionSafe?: boolean;
}
```

### Validation unifiée

**Schéma Zod :**

```typescript
const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Le fichier ne peut pas être vide.")
    .refine((file) => file.size < 4 * 1024 * 1024, "4MB max")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
      "Formats supportés : JPEG, PNG, WebP, GIF"
    ),
  fileName: z.string().min(3, "Nom minimum 3 caractères"),
});
```

**Fonctionnalités :**

- ✅ Validation stricte des fichiers (taille, format, nom)
- ✅ Sanitisation des noms avec `slugify()` + timestamp
- ✅ Vérification des permissions par rôle utilisateur
- ✅ Génération automatique d'URLs publiques Supabase
- ✅ Gestion d'erreurs unifiée avec types stricts

## Buckets configurés

### Bucket `products`

- **Usage :** Images de produits e-commerce
- **Fonction :** `uploadProductImageCore(formData)`
- **Permission :** `products:update`
- **Wrapper auth :** `withPermissionSafe`
- **API publique :** `uploadProductImage` (rétrocompatibilité)

### Bucket `magazine`

- **Usage :** Images d'articles de blog et contenu éditorial
- **Fonction :** `uploadMagazineImageCore(formData)`
- **Permission :** `content:create`
- **Wrapper auth :** Vérification manuelle `checkUserPermission`
- **API publique :** `uploadMagazineImage` (rétrocompatibilité)

## Types TypeScript

### UploadImageResult

```typescript
export type UploadImageResult =
  | {
      success: true;
      data: { url: string };
      message: string;
    }
  | {
      success: false;
      message: string;
      errors?: {
        file?: string[];
        fileName?: string[];
      };
    };
```

### AppPermission

Le système utilise les types stricts de `@/lib/auth/types` pour la vérification des permissions :

```typescript
type AppPermission = "products:update" | "content:create" | ...
```

## Sécurité

### Politiques RLS (Row Level Security)

- **Bucket `products`** : Lecture publique, écriture restreinte aux éditeurs/admins
- **Bucket `magazine`** : Lecture publique, écriture restreinte aux créateurs de contenu

### Vérification des permissions

1. **Niveau Server Actions :** `withPermissionSafe` ou `checkUserPermission`
2. **Niveau base de données :** Politiques RLS sur les buckets
3. **Niveau application :** Validation des types `AppPermission`

### Audit et logs

- Erreurs d'upload loggées avec `console.error`
- Tentatives d'accès non autorisées enregistrées
- Intégration avec le système d'audit existant

## Utilisation

### Pour les produits

```typescript
import { uploadProductImage } from "@/actions/productActions";

const formData = new FormData();
formData.append("file", file);
formData.append("fileName", "mon-produit");

const result = await uploadProductImage(formData);
if (result.success) {
  console.log("URL:", result.data.url);
}
```

### Pour le magazine

```typescript
import { uploadMagazineImage } from "@/actions/magazineActions";

const formData = new FormData();
formData.append("file", file);
formData.append("fileName", "article-image");

const result = await uploadMagazineImage(formData);
if (result.success) {
  console.log("URL:", result.data.url);
}
```

### Utilisation directe (avancée)

```typescript
import { uploadProductImageCore, uploadMagazineImageCore } from "@/lib/storage/image-upload";

// Usage direct des fonctions core
const result = await uploadProductImageCore(formData);
const result = await uploadMagazineImageCore(formData);
```

## Tests

### Tests unitaires

**Localisation :** `src/lib/storage/__tests__/image-upload.test.ts`

**Couverture :**

- ✅ Vérification de l'existence des fonctions
- ✅ Validation des types de retour
- ✅ Test des cas d'erreur avec mocks
- ✅ Vérification de l'interface publique

### Tests d'intégration

**Localisation :** `src/actions/__tests__/productActions.test.ts`

**Couverture :**

- ✅ Upload réussi avec fichier valide
- ✅ Échec avec fichier trop volumineux
- ✅ Échec avec erreur de stockage Supabase
- ✅ Validation des permissions

## Évolutivité

### Ajouter un nouveau bucket

1. Étendre le type `BucketConfig['bucket']` :

   ```typescript
   bucket: "products" | "magazine" | "avatars" | "documents";
   ```

2. Créer la fonction wrapper :

   ```typescript
   export async function uploadAvatarImageCore(formData: FormData) {
     return uploadImageCore(formData, {
       bucket: "avatars",
       permission: "profile:update:own",
     });
   }
   ```

3. Configurer les politiques RLS dans Supabase

4. Ajouter les tests correspondants

### Ajouter d'autres types de fichiers

- Étendre le schéma Zod avec de nouveaux formats
- Adapter la validation selon le type de contenu
- Considérer des schémas différents par bucket si nécessaire

## Migration et rétrocompatibilité

### Factorisation (Janvier 2025)

- ✅ **Avant :** 2 fonctions dupliquées (~140 lignes total)
- ✅ **Après :** 1 fonction core + 2 wrappers (~70 lignes total)
- ✅ **Économie :** -50% de code, maintenance centralisée
- ✅ **Impact :** Aucun changement d'API publique, rétrocompatibilité totale

### Points d'utilisation préservés

- `src/components/admin/image-upload-field.tsx` (produits)
- `src/components/admin/magazine/image-upload-field.tsx` (magazine admin)
- `src/components/magazine/image-upload.tsx` (éditeur modal)
- `src/components/magazine/tiptap-editor.tsx` (drag & drop TipTap)

## Performances

### Optimisations

- ✅ Validation côté client et serveur pour feedback rapide
- ✅ Upload direct vers Supabase Storage (pas de proxy serveur)
- ✅ Génération d'URLs publiques en une seule requête
- ✅ Sanitisation efficace des noms de fichiers

### Métriques

- **Taille max :** 4MB par fichier
- **Formats :** JPEG, PNG, WebP, GIF
- **Temps d'upload :** ~1-3s selon taille et connexion
- **URL publique :** Disponible immédiatement après upload

## Maintenance

### Points d'attention

- Surveiller la taille du bucket Supabase
- Nettoyer régulièrement les fichiers orphelins
- Mettre à jour les politiques RLS si nouveaux rôles
- Vérifier les logs d'erreur pour optimisations

### Évolutions futures

- Support des vidéos et documents
- Redimensionnement automatique d'images
- CDN et optimisation de cache
- Compression automatique selon le contexte
