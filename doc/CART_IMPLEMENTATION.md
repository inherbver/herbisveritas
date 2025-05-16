# Implémentation du Panier

## Architecture

### Structure des Données

```typescript
interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  inStock: boolean;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}
```

### Stockage

- **Client** : Stockage local avec Zustand + persistance dans localStorage
- **Serveur** : Synchronisation avec Supabase (tables `carts` et `cart_items`)

## Workflows

### Ajout au Panier

1. Vérification de la disponibilité du produit
2. Mise à jour de l'état local
3. Synchronisation avec le serveur (si authentifié)
4. Mise à jour du stock

### Mise à Jour de la Quantité

1. Validation de la nouvelle quantité (min: 1, max: stock disponible)
2. Mise à jour de l'état local
3. Synchronisation avec le serveur (si authentifié)

### Suppression d'Article

1. Suppression de l'article du panier local
2. Suppression sur le serveur (si authentifié)
3. Mise à jour du stock

## Intégration avec Supabase

### Schéma de la Base de Données

```sql
-- Table des paniers
create table carts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table des articles du panier
create table cart_items (
  id uuid default uuid_generate_v4() primary key,
  cart_id uuid references carts(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(cart_id, product_id)
);
```

### Politiques RLS (Row Level Security)

```sql
-- Autoriser la lecture/écriture uniquement au propriétaire du panier
create policy "Users can view their own cart"
on carts for select
using (auth.uid() = user_id);

create policy "Users can update their own cart"
on carts for update
using (auth.uid() = user_id);

-- Politiques similaires pour cart_items
```

## Implémentation

### Store Zustand

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, CartState } from "@/types/cart";

const useCartStore = create<CartState>(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      lastUpdated: 0,

      addItem: async (item) => {
        // Implémentation de l'ajout
      },

      updateQuantity: async (productId, quantity) => {
        // Implémentation de la mise à jour
      },

      removeItem: async (productId) => {
        // Implémentation de la suppression
      },

      syncCart: async () => {
        // Synchronisation avec le serveur
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
```

### Composants

#### CartDisplay.tsx

```tsx
"use client";

import { useCartStore } from "@/stores/cartStore";

export function CartDisplay() {
  const { items, isLoading, updateQuantity, removeItem } = useCartStore();

  if (isLoading) return <div>Chargement...</div>;
  if (items.length === 0) return <div>Votre panier est vide</div>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded border p-4">
          <div className="flex items-center space-x-4">
            <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded object-cover" />
            <div>
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.price} €</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className="rounded border px-2 py-1"
            >
              -
            </button>
            <span>{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="rounded border px-2 py-1"
              disabled={!item.inStock}
            >
              +
            </button>

            <button onClick={() => removeItem(item.productId)} className="ml-4 text-red-500">
              Supprimer
            </button>
          </div>
        </div>
      ))}

      <div className="mt-6 border-t pt-4">
        <div className="flex justify-between">
          <span>Total</span>
          <span className="font-bold">
            {items.reduce((sum, item) => sum + item.price * item.quantity, 0)} €
          </span>
        </div>

        <button
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => {
            /* Navigation vers la page de paiement */
          }}
        >
          Passer la commande
        </button>
      </div>
    </div>
  );
}
```

## Tests

### Tests Unitaires

```typescript
describe("Cart Store", () => {
  it("should add item to cart", () => {
    const item = { id: "1", name: "Test", price: 10, quantity: 1 };
    useCartStore.getState().addItem(item);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
```

### Tests d'Intégration

- Test d'ajout/suppression d'articles
- Test de synchronisation avec le serveur
- Test de persistance locale

## Bonnes Pratiques

### Performance

- Utilisation de sélecteurs pour éviter les rendus inutiles
- Chargement paresseux des données
- Mise en cache des requêtes

### Sécurité

- Validation côté serveur de toutes les entrées
- Vérification des permissions
- Protection contre les attaques par force brute

### Expérience Utilisateur

- Retour visuel immédiat pour les actions
- Gestion des états de chargement
- Messages d'erreur clairs
