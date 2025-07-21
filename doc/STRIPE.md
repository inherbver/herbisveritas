# Documentation Stripe - HerbisVeritas

Cette documentation décrit l'implémentation complète de Stripe dans la codebase et en base de données.

## Configuration et Environnement

### Variables d'environnement requises

- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** - Clé publique Stripe (client-side)
- **`STRIPE_SECRET_KEY`** - Clé secrète Stripe (server-side uniquement)
- **`STRIPE_WEBHOOK_SECRET`** - Secret de validation des webhooks
- **`NEXT_PUBLIC_BASE_URL`** - URL de base pour les redirections

### Configuration centrale

**Fichier** : `src/lib/stripe/index.ts`

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});
```

## Architecture de Base de Données

### Tables principales liées aux paiements

#### Table `orders`

```sql
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  order_number text UNIQUE,
  status order_status_type DEFAULT 'pending_payment',
  total_amount numeric CHECK (total_amount >= 0),
  currency char(3) DEFAULT 'EUR',
  shipping_address_id uuid REFERENCES addresses(id),
  billing_address_id uuid REFERENCES addresses(id),
  shipping_fee numeric DEFAULT 0.00 CHECK (shipping_fee >= 0),
  payment_method text,
  payment_intent_id text,
  payment_status payment_status_type DEFAULT 'pending',
  stripe_checkout_session_id text UNIQUE,
  stripe_checkout_id text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);
```

**Colonnes Stripe spécifiques :**

- `stripe_checkout_session_id` : ID unique de la session de checkout
- `stripe_checkout_id` : ID alternatif de checkout
- `payment_intent_id` : ID de l'intention de paiement Stripe
- `payment_method` : Méthode de paiement utilisée

#### Table `order_items`

```sql
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  product_id uuid REFERENCES products(id),
  quantity integer CHECK (quantity > 0),
  price_at_purchase numeric CHECK (price_at_purchase >= 0),
  product_sku_at_purchase text,
  product_name_at_purchase text,
  product_image_url_at_purchase text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);
```

**Fonctionnalité de snapshot :** Les données produit sont capturées au moment de l'achat pour préserver l'historique.

#### Table `addresses`

```sql
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  address_type text CHECK (address_type IN ('shipping', 'billing')),
  is_default boolean DEFAULT false,
  company_name text,
  full_name text,
  first_name text,
  last_name text,
  email text,
  address_line1 text NOT NULL,
  address_line2 text,
  postal_code text NOT NULL,
  city text NOT NULL,
  country_code char(2),
  state_province_region text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Table `shipping_methods`

```sql
CREATE TABLE public.shipping_methods (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  carrier text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Données de référence :**

- `colissimo_domicile` : Colissimo Domicile (5,95 €)
- `colissimo_pickup` : Colissimo Point Retrait (4,50 €)
- `chronopost_express` : Chronopost Express 24h (12,50 €)

### Fonction RPC `create_order_from_cart`

**Localisation** : Base de données PostgreSQL  
**Utilisation** : Webhook Stripe (Edge Function)

```sql
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
```

**Fonctionnalités :**

- Validation et verrouillage du panier
- Calcul automatique du montant total
- Création atomique de la commande et des items
- Nettoyage du panier après succès
- Gestion d'erreurs avec rollback

## Implémentation Frontend

### Server Action : `createStripeCheckoutSession`

**Fichier** : `src/actions/stripeActions.ts`

**Fonctionnalités principales :**

- **Validation sécurisée** : Prix validés côté serveur contre la base de données
- **Gestion d'adresses** : Sauvegarde automatique pour utilisateurs connectés
- **Support multi-utilisateurs** : Authentifiés et invités
- **Méthodes de paiement** : Carte bancaire et PayPal
- **Livraison dynamique** : Intégration avec `shipping_methods`

**Métadonnées Stripe :**

```typescript
metadata: {
  cartId: cart.id,
  userId: user?.id || "guest",
  shippingAddressId: finalShippingAddressId || "guest_address",
  billingAddressId: finalBillingAddressId || "guest_address",
  shippingMethodId: shippingMethodId,
}
```

### Interface Checkout

#### Page principale

**Fichier** : `src/app/[locale]/checkout/page.tsx`

**Fonctionnalités :**

- Récupération SSR des données (adresses, méthodes de livraison)
- Redirection automatique si panier vide
- Gestion des fallbacks pour données manquantes

#### Composant client

**Fichier** : `src/components/domain/checkout/CheckoutClientPage.tsx`

**Fonctionnalités avancées :**

- **Synchronisation d'état** : Zustand + données serveur
- **Gestion d'adresses** : Édition inline, création dynamique
- **Facturation séparée** : Option adresse différente
- **Calculs temps réel** : Sous-total + frais de port
- **UX optimisée** : États de chargement, gestion d'erreurs

### Pages de résultat

#### Succès : `src/app/[locale]/checkout/success/page.tsx`

- Interface de confirmation avec icône de validation
- Lien de retour à l'accueil
- Support multilingue

#### Annulation : `src/app/[locale]/checkout/canceled/page.tsx`

- Interface d'erreur avec possibilité de relancer
- Lien vers le panier pour modification
- Support multilingue

## Webhooks Stripe

### Webhook Next.js (API Route)

**Fichier** : `src/app/api/stripe-webhook/route.ts`

**Fonctionnalités :**

- **Événement traité** : `checkout.session.completed`
- **Sécurité** : Validation signature webhook
- **Idempotence** : Vérification des sessions déjà traitées
- **Accès privilégié** : Utilise `service_role` pour contourner RLS
- **Création directe** : Insertion dans `orders` et `order_items`
- **Nettoyage** : Suppression des items du panier après succès

### Webhook Supabase (Edge Function)

**Fichier** : `supabase/functions/stripe-webhook/index.ts`

**Fonctionnalités :**

- **Runtime Deno** : Environnement Supabase Edge Functions
- **Délégation** : Utilise la fonction RPC `create_order_from_cart`
- **API simplifiée** : Version `"2024-04-10"` de Stripe
- **Gestion d'erreurs** : Retour HTTP 200 pour éviter les retry

## Sécurité et Politiques RLS

### Validation des prix

- **Principe** : Tous les prix sont validés côté serveur
- **Source de vérité** : Table `products` en base de données
- **Protection** : Anti-manipulation des prix côté client

### Politiques RLS adaptées

- **Accès utilisateur** : Lecture/écriture des propres données seulement
- **Accès admin** : Gestion complète via rôles `admin` et `dev`
- **Accès webhook** : Contournement RLS via `service_role`

### Gestion des erreurs

- **Idempotence** : Vérification des doublons via `stripe_checkout_session_id`
- **Rollback** : Transactions atomiques pour cohérence des données
- **Logs** : Traçabilité complète des opérations

## Types TypeScript

### Types principaux

```typescript
interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  is_default: boolean;
  // ... autres champs d'adresse
}

interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  carrier?: string;
  is_active: boolean;
}

interface CartData {
  id: string;
  user_id?: string;
  guest_id?: string;
  items: CartItem[];
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
}
```

## Intégration et Workflow

### Flux complet de paiement

1. **Préparation** : Validation du panier côté serveur
2. **Session Stripe** : Création via `createStripeCheckoutSession`
3. **Paiement** : Redirection vers Stripe Checkout
4. **Finalisation** : Webhook traite `checkout.session.completed`
5. **Commande** : Création dans `orders` et `order_items`
6. **Nettoyage** : Suppression du panier
7. **Redirection** : Page de succès avec confirmation

### Points d'extension

- **Méthodes de livraison** : Ajout via table `shipping_methods`
- **Devises** : Support multi-devises configuré
- **Notifications** : Hooks pour emails de confirmation
- **Statuts avancés** : Suivi de commande via `order_status_type`

## Monitoring et Maintenance

### Variables d'environnement critiques

- Rotation périodique des clés secrètes
- Tests réguliers des webhooks
- Monitoring des échecs de paiement

### Performance

- Index sur `stripe_checkout_session_id` pour idempotence
- Queries optimisées pour la récupération de commandes
- Cache des méthodes de livraison

Cette implémentation Stripe offre une solution complète, sécurisée et maintenable pour les paiements e-commerce avec une architecture scalable et une expérience utilisateur optimisée.
