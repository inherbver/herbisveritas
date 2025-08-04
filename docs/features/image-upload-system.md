# Système d'Upload d'Images

## Vue d'ensemble

Le système d'upload d'images d'Herbis Veritas est centralisé et réutilisable pour tous les types de contenu : produits, articles de magazine, marchés et partenaires.

## Architecture

### Composants principaux

1. **`/lib/storage/image-upload.ts`** - Logique centralisée
2. **`/components/admin/image-upload-button.tsx`** - Composant UI réutilisable
3. **Actions spécialisées** - Une pour chaque type de contenu

### Buckets Supabase

| Bucket | Utilisation | Permissions |
|--------|-------------|-------------|
| `products` | Images de produits | `products:update` |
| `magazine` | Articles du magazine | `content:create` |
| `contact` | Marchés et partenaires | `content:create` |

## Utilisation

### 1. Import des fonctions d'upload

```typescript
// Pour les marchés
import { uploadMarketImage } from "@/actions/marketActions";

// Pour les partenaires
import { uploadPartnerImage } from "@/actions/partnerActions";

// Pour les produits
import { uploadProductImage } from "@/actions/productActions";

// Pour le magazine
import { uploadMagazineImage } from "@/actions/magazineActions";
```

### 2. Intégration dans un formulaire

```tsx
import { ImageUploadButton } from "@/components/admin/image-upload-button";
import { useRef } from "react";

export function MarketForm() {
  const imageUrlRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>Image du marché</Label>
      <div className="flex gap-2">
        <Input
          ref={imageUrlRef}
          name="hero_image_url"
          type="url"
          placeholder="https://example.com/image.jpg"
          className="flex-1"
        />
        <ImageUploadButton
          onUploadSuccess={(url) => {
            if (imageUrlRef.current) {
              imageUrlRef.current.value = url;
            }
          }}
          uploadFunction={uploadMarketImage}
          label="Upload"
        />
      </div>
    </div>
  );
}
```

## Caractéristiques

### Validation

- **Taille max** : 4MB
- **Formats acceptés** : JPEG, PNG, WebP, GIF
- **Validation Zod** intégrée

### Sécurité

- Vérification des permissions par rôle
- Sanitisation des noms de fichiers avec `slugify`
- Upload sécurisé via Supabase

### UX

- Indicateur de chargement
- Messages de succès/erreur via toast
- Aperçu de l'image uploadée
- Support des URLs externes

## Extension du système

Pour ajouter un nouveau type d'upload :

1. **Ajouter la fonction dans `image-upload.ts`** :
```typescript
export async function uploadNewTypeImageCore(formData: FormData): Promise<UploadImageResult> {
  return uploadImageCore(formData, {
    bucket: "your-bucket",
    permission: "your:permission",
  });
}
```

2. **Exporter depuis l'action correspondante** :
```typescript
// Dans votre fichier actions
export const uploadNewTypeImage = uploadNewTypeImageCore;
```

3. **Utiliser dans votre formulaire** avec `ImageUploadButton`

## Exemples d'implémentation

### Markets (Marchés)
- Bucket : `contact`
- Champs : `hero_image_url`, `image_url`
- Permission : `content:create`

### Partners (Partenaires)
- Bucket : `contact`
- Champ : `image_url`
- Permission : `content:create`

### Products (Produits)
- Bucket : `products`
- Champ : `image_url`
- Permission : `products:update`

### Magazine
- Bucket : `magazine`
- Champ : `featured_image`
- Permission : `content:create`