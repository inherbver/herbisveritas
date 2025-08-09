# Architecture Documentation - Herbisveritas E-commerce Platform

## Executive Summary

Herbisveritas est une plateforme e-commerce spécialisée dans la vente de produits à base de plantes, construite avec Next.js 15 et une architecture pragmatique orientée serveur. Suite à un refactoring majeur, le projet a abandonné une architecture DDD/Clean Architecture complexe au profit d'une approche plus simple et maintenable, alignée avec les patterns natifs de Next.js.

### Caractéristiques Clés

- **Architecture Server-First** avec React Server Components
- **Simplification radicale** après suppression de 100+ fichiers de l'architecture DDD
- **Stack moderne** : Next.js 15, Supabase, Stripe, Zustand
- **Internationalisation complète** avec next-intl (FR, EN, DE, ES)
- **Performance optimisée** avec Turbo et Edge Runtime

## Table des Matières

1. [Vue d'Ensemble Architecturale](#1-vue-densemble-architecturale)
2. [Décisions de Design](#2-décisions-de-design)
3. [Structure du Projet](#3-structure-du-projet)
4. [Composants Principaux](#4-composants-principaux)
5. [Flux de Données](#5-flux-de-données)
6. [Système d'Authentification](#6-système-dauthentification)
7. [Gestion E-commerce](#7-gestion-e-commerce)
8. [Magazine/Blog](#8-magazineblog)
9. [Intégrations Externes](#9-intégrations-externes)
10. [Patterns et Conventions](#10-patterns-et-conventions)
11. [Performance et Optimisations](#11-performance-et-optimisations)
12. [Sécurité](#12-sécurité)
13. [Déploiement et Infrastructure](#13-déploiement-et-infrastructure)

---

## 1. Vue d'Ensemble Architecturale

### 1.1 Architecture Actuelle

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
├─────────────────────────────────────────────────────────────┤
│                      Next.js App Router                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               React Server Components                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Pages   │  │ Layouts  │  │ Server Actions   │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Client Components                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │   Forms  │  │   Cart   │  │  Interactive UI  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     BUSINESS LOGIC LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Services   │  │  Validators  │  │    Stores    │      │
│  │              │  │     (Zod)    │  │   (Zustand)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                       DATA ACCESS LAYER                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Supabase Client SDK                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Server  │  │  Admin   │  │     Client       │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Supabase │  │  Stripe  │  │Colissimo │  │   CDN    │   │
│  │   (DB)   │  │(Payments)│  │(Shipping)│  │ (Images) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Philosophie Architecturale

L'architecture actuelle suit le principe **"Pragmatic over Pure"** :

1. **Simplicité avant tout** : Préférence pour les solutions natives Next.js
2. **Co-location des concerns** : Regroupement de la logique par domaine métier
3. **Server-First** : Maximisation de l'utilisation des Server Components
4. **Type Safety** : TypeScript strict avec validation Zod
5. **Performance** : Optimisations avec cache et Edge Runtime

## 2. Décisions de Design

### 2.1 Abandon de la Clean Architecture

**Avant (Architecture DDD complexe)** :

- 8 services pour gérer les articles (ArticleCrudService, ArticleSearchService, etc.)
- Couches d'abstraction multiples (Domain, Infrastructure, Application)
- Interfaces et abstractions génériques
- Event sourcing et CQRS patterns
- ~200 fichiers pour la logique métier

**Après (Architecture pragmatique)** :

- 1 service unifié par domaine (MagazineService, CartService, etc.)
- 3 couches simples (Actions → Services → Supabase)
- Types métier directs sans abstractions
- Server Actions pour les mutations
- ~50 fichiers pour la même logique

### 2.2 Choix Technologiques Majeurs

| Aspect           | Technologie              | Justification                              |
| ---------------- | ------------------------ | ------------------------------------------ |
| Framework        | Next.js 15               | App Router, Server Components, Performance |
| Base de données  | Supabase                 | PostgreSQL managé, Auth intégré, RLS       |
| State Management | Zustand                  | Simplicité, Performance, Persistence       |
| Validation       | Zod                      | Type inference, Runtime validation         |
| Styling          | Tailwind CSS + shadcn/ui | Rapidité, Cohérence, Composants prêts      |
| Paiements        | Stripe                   | Standard industrie, Fiabilité              |
| I18n             | next-intl                | Intégration Next.js native                 |

### 2.3 Patterns Architecturaux Adoptés

#### Server Components Pattern

```typescript
// Page Server Component - Fetch data côté serveur
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  return (
    <>
      <ProductDetail product={product} />
      <AddToCartButton productId={product.id} /> {/* Client Component */}
    </>
  );
}
```

#### Server Actions Pattern

```typescript
"use server";

export async function addToCartAction(formData: FormData) {
  // 1. Validation
  const result = AddToCartSchema.safeParse(formData);
  if (!result.success) return { error: result.error };

  // 2. Authentication
  const user = await getUser();

  // 3. Business Logic
  const cart = await cartService.addItem(user.id, result.data);

  // 4. Revalidation
  revalidateTag("cart");

  return { success: true, data: cart };
}
```

## 3. Structure du Projet

### 3.1 Organisation des Dossiers

```
src/
├── actions/                 # Server Actions (orchestration)
│   ├── addressActions.ts    # Gestion des adresses
│   ├── authActions.ts       # Authentification
│   ├── cartActions.ts       # Panier d'achat
│   ├── magazineActions.ts   # Articles de blog
│   ├── productActions.ts    # Produits
│   └── stripeActions.ts     # Paiements
│
├── app/                     # Next.js App Router
│   ├── [locale]/           # Routes internationalisées
│   │   ├── admin/          # Panel administration
│   │   ├── shop/           # Boutique
│   │   ├── magazine/       # Blog/Magazine
│   │   ├── profile/        # Espace utilisateur
│   │   └── checkout/       # Tunnel de commande
│   ├── api/                # API Routes
│   └── globals.css         # Styles globaux
│
├── components/             # Composants React
│   ├── admin/             # Composants admin
│   ├── auth/              # Auth & permissions
│   ├── domain/            # Composants métier
│   │   ├── shop/         # E-commerce
│   │   ├── checkout/     # Checkout
│   │   └── colissimo/    # Widget livraison
│   ├── layout/            # Structure page
│   ├── magazine/          # Blog components
│   ├── shared/            # Composants partagés
│   └── ui/                # shadcn/ui
│
├── lib/                    # Logique métier
│   ├── actions/           # Actions supplémentaires
│   ├── auth/              # Services auth
│   │   ├── admin-service.ts
│   │   └── server-auth.ts
│   ├── services/          # Services métier
│   │   └── magazine.service.ts
│   ├── supabase/          # Clients Supabase
│   │   ├── client.ts     # Client navigateur
│   │   ├── server.ts     # Client serveur
│   │   └── admin.ts      # Client admin
│   ├── stripe/            # Configuration Stripe
│   └── validators/        # Schémas Zod
│
├── stores/                 # Stores Zustand
│   ├── cartStore.ts       # État du panier
│   ├── addressStore.ts    # Adresses utilisateur
│   └── profileStore.ts    # Profil utilisateur
│
├── types/                  # Types TypeScript
│   ├── cart.ts            # Types panier
│   ├── magazine.ts        # Types blog
│   ├── product-types.ts   # Types produits
│   └── supabase.ts        # Types DB générés
│
├── i18n/                   # Traductions
│   └── messages/
│       ├── fr/            # Français (défaut)
│       └── en/            # Anglais
│
└── middleware.ts           # Middleware Next.js
```

### 3.2 Flux de Navigation Principal

```
/[locale]/shop (Page d'accueil)
    │
    ├── /products/[slug] → Détail produit
    │   └── Add to cart → Update cartStore
    │
    ├── /cart → Panier (Sheet component)
    │   └── /checkout → Tunnel de commande
    │       ├── Address Form
    │       ├── Shipping Method
    │       └── Stripe Payment
    │
    ├── /magazine → Blog/Articles
    │   └── /magazine/[slug] → Article détail
    │
    └── /profile → Espace membre
        ├── /account → Informations
        ├── /orders → Commandes
        └── /addresses → Adresses
```

## 4. Composants Principaux

### 4.1 Server Actions

Les Server Actions orchestrent la logique métier et gèrent les mutations :

```typescript
// src/actions/cartActions.ts
export async function addItemToCart(
  prevState: unknown,
  formData: FormData
): Promise<CartActionResult<CartData | null>> {
  // 1. Validation des données
  const validatedFields = AddToCartInputSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });

  // 2. Authentification utilisateur
  const activeUserId = await getActiveUserId(supabase);

  // 3. Logique métier (création/mise à jour panier)
  const { error: rpcError } = await supabase.rpc("add_or_update_cart_item", {
    p_cart_id: cartId,
    p_product_id: productId,
    p_quantity_to_add: quantity,
  });

  // 4. Invalidation du cache
  revalidateTag("cart");

  // 5. Retour du résultat typé
  return createSuccessResult(updatedCart.data, "Article ajouté au panier");
}
```

### 4.2 Services Métier

Les services contiennent la logique métier réutilisable :

```typescript
// src/lib/services/magazine.service.ts
export class MagazineService {
  async createArticle(authorId: string, data: CreateArticleData): Promise<Article> {
    // Validation métier
    this.validateArticleData(data);

    // Génération slug unique
    const slug = await this.generateUniqueSlug(data.title);

    // Calcul temps de lecture
    const readingTime = this.calculateReadingTime(data.content);

    // Persistence
    const { data: article, error } = await this.supabase
      .from("articles")
      .insert({ ...data, slug, reading_time_minutes: readingTime })
      .select()
      .single();

    return this.mapToArticle(article);
  }

  // Méthodes de recherche, mise à jour, publication, etc.
  async searchArticles(query: string, options: SearchOptions) {
    /* ... */
  }
  async publishArticle(id: string) {
    /* ... */
  }
  async incrementViewCount(id: string) {
    /* ... */
  }
}
```

### 4.3 Stores Zustand

Les stores gèrent l'état client avec persistence :

```typescript
// src/stores/cartStore.ts
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [] as CartItem[],
      isLoading: false,
      error: null,

      addItem: (itemDetails, quantityToAdd = 1) => {
        const currentItems = get().items;
        const existingItemIndex = currentItems.findIndex(
          (item) => item.productId === itemDetails.productId
        );

        if (existingItemIndex !== -1) {
          // Mise à jour quantité
          const updatedItems = currentItems.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantityToAdd }
              : item
          );
          set({ items: updatedItems, error: null });
        } else {
          // Ajout nouvel item
          const newItem: CartItem = { ...itemDetails, quantity: quantityToAdd };
          set({ items: [...currentItems, newItem], error: null });
        }
      },

      // Autres méthodes: removeItem, updateQuantity, clearCart, etc.
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

## 5. Flux de Données

### 5.1 Flux de Lecture (Server Components)

```
User Request → Next.js Router → Server Component
                                      ↓
                              Supabase Query (RLS)
                                      ↓
                               Data Fetching
                                      ↓
                                SSR HTML Response
```

### 5.2 Flux de Mutation (Server Actions)

```
Form Submit → Server Action → Validation (Zod)
                                   ↓
                            Authentication Check
                                   ↓
                            Business Logic (Service)
                                   ↓
                            Database Update (Supabase)
                                   ↓
                            Cache Invalidation
                                   ↓
                            Response to Client
                                   ↓
                            Store Update (Zustand)
```

### 5.3 Flux de Paiement (Stripe)

```
Checkout Page → Create Session (Server Action)
                        ↓
                 Stripe Checkout API
                        ↓
                 Redirect to Stripe
                        ↓
                 Payment Processing
                        ↓
                 Webhook Callback
                        ↓
                 Order Creation (DB)
                        ↓
                 Success/Cancel Page
```

## 6. Système d'Authentification

### 6.1 Architecture Auth

```
┌──────────────────────────────────────────┐
│            Middleware Layer              │
│   Route Protection + Role Checking       │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│          Admin Service Layer             │
│   checkAdminRole() + Permissions         │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│          Supabase Auth + RLS             │
│   JWT Tokens + Row Level Security        │
└──────────────────────────────────────────┘
```

### 6.2 Middleware d'Authentification

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // 1. Gestion i18n
  const response = handleI18n(request);

  // 2. Création client Supabase
  const supabase = createServerClient(/* ... */);

  // 3. Vérification authentification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Protection routes admin
  if (pathToCheck.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(`/${locale}/login`);
    }

    // Vérification rôle admin via DB
    const adminCheck = await checkAdminRole(user.id);
    if (!adminCheck.isAdmin) {
      await logSecurityEvent({
        type: "unauthorized_admin_access",
        userId: user.id,
        details: { path: pathToCheck },
      });
      return NextResponse.redirect(`/${locale}/unauthorized`);
    }
  }

  // 5. Protection routes profil
  if (pathToCheck.startsWith("/profile")) {
    if (!user) {
      return NextResponse.redirect(`/${locale}/login?redirectUrl=${pathname}`);
    }
  }

  return response;
}
```

### 6.3 Service Admin avec Cache

```typescript
// src/lib/auth/admin-service.ts
const roleCache = new Map<string, CachedRoleData>();

export async function checkAdminRole(userId: string): Promise<AdminCheckResult> {
  // 1. Vérification cache
  const cached = getCachedRoleData(userId);
  if (cached) {
    return {
      isAdmin: isAdminRole(cached.role),
      role: cached.role,
      permissions: cached.permissions,
      userId,
    };
  }

  // 2. Query base de données
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  // 3. Calcul permissions
  const permissions = getPermissionsForRole(profile.role);

  // 4. Mise en cache (TTL: 5 minutes)
  setCachedRoleData(userId, profile.role, permissions);

  return {
    isAdmin: isAdminRole(profile.role),
    role: profile.role,
    permissions,
    userId,
  };
}
```

### 6.4 Row Level Security (RLS)

```sql
-- Politique pour les produits
CREATE POLICY "products_read_all" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_modify_admin" ON products
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role IN ('admin', 'super_admin')
    )
  );

-- Politique pour les commandes
CREATE POLICY "orders_read_own" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Politique pour le panier
CREATE POLICY "cart_items_manage_own" ON cart_items
  FOR ALL USING (
    cart_id IN (
      SELECT id FROM carts WHERE user_id = auth.uid()
    )
  );
```

## 7. Gestion E-commerce

### 7.1 Architecture du Panier

```
┌─────────────────────────────────────────┐
│          Client Components              │
│   CartSheet, ProductCard, CartDisplay   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            Zustand Store                │
│   cartStore (items, total, actions)     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Server Actions                │
│   addItemToCart, removeItem, update     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Supabase Functions              │
│   add_or_update_cart_item (RPC)         │
└─────────────────────────────────────────┘
```

### 7.2 Synchronisation Panier Auth/Guest

```typescript
// src/hooks/use-auth-cart-sync.ts
export function useAuthCartSync() {
  useEffect(() => {
    const syncCart = async () => {
      // 1. Récupération panier local (guest)
      const localItems = useCartStore.getState().items;

      // 2. Si utilisateur connecté
      const user = await getUser();
      if (user && localItems.length > 0) {
        // 3. Fusion avec panier serveur
        for (const item of localItems) {
          await addItemToCart(item.productId, item.quantity);
        }

        // 4. Nettoyage panier local
        useCartStore.getState().clearCart();

        // 5. Rechargement depuis serveur
        const serverCart = await getCart();
        useCartStore.getState().setItems(serverCart.items);
      }
    };

    syncCart();
  }, [isAuthenticated]);
}
```

### 7.3 Tunnel de Commande

```typescript
// src/components/domain/checkout/CheckoutClientPage.tsx
export default function CheckoutClientPage({
  cart,
  shippingAddress,
  billingAddress,
  shippingMethods,
  isUserAuthenticated,
}: CheckoutClientPageProps) {
  // 1. État local UI
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState();
  const [useDifferentBilling, setUseDifferentBilling] = useState(false);

  // 2. Calculs
  const shippingCost = selectedShippingMethod?.price || 0;
  const totalAmount = subtotal + shippingCost;

  // 3. Gestion adresses
  const handleAddressSubmit = async (data: AddressFormData) => {
    if (isUserAuthenticated) {
      await saveAddress(data);
    }
    setShippingAddress(data);
  };

  // 4. Création session Stripe
  const handleCheckout = async () => {
    const session = await createStripeCheckoutSession({
      items: cart.items,
      shippingAddress,
      billingAddress: useDifferentBilling ? billingAddress : shippingAddress,
      shippingMethodId: selectedShippingMethodId,
    });

    // Redirection vers Stripe
    window.location.href = session.url;
  };

  return (
    <div className="checkout-container">
      <CartSummary items={cart.items} />
      <AddressForm onSubmit={handleAddressSubmit} />
      <ShippingMethods
        methods={shippingMethods}
        selected={selectedShippingMethodId}
        onSelect={setSelectedShippingMethodId}
      />
      <OrderSummary total={totalAmount} />
      <CheckoutButton onClick={handleCheckout} />
    </div>
  );
}
```

## 8. Magazine/Blog

### 8.1 Service Magazine Unifié

```typescript
// src/lib/services/magazine.service.ts
export class MagazineService {
  // CRUD Operations
  async createArticle(authorId: string, data: CreateArticleData): Promise<Article>;
  async updateArticle(id: string, data: UpdateArticleData): Promise<Article>;
  async deleteArticle(id: string): Promise<void>;
  async getArticleById(id: string): Promise<Article | null>;
  async getArticleBySlug(slug: string): Promise<Article | null>;

  // Publication Management
  async publishArticle(id: string): Promise<Article>;
  async scheduleArticle(id: string, scheduledAt: Date): Promise<Article>;
  async archiveArticle(id: string): Promise<Article>;

  // Search & Filtering
  async searchArticles(query: string, options?: SearchOptions): Promise<SearchResult>;
  async getArticlesByCategory(category: string, limit?: number): Promise<Article[]>;
  async getArticlesByTag(tag: string, limit?: number): Promise<Article[]>;
  async getFeaturedArticles(limit?: number): Promise<Article[]>;

  // Analytics
  async incrementViewCount(id: string): Promise<void>;
  async incrementLikeCount(id: string): Promise<void>;
  async trackReading(id: string, userId: string, progress: number): Promise<void>;

  // Content Processing
  private validateArticleData(data: CreateArticleData): void;
  private generateUniqueSlug(title: string, excludeId?: string): Promise<string>;
  private calculateReadingTime(content: string): number;
  private extractExcerpt(content: string, maxLength?: number): string;
}
```

### 8.2 Éditeur TipTap

```typescript
// src/components/magazine/tiptap-editor.tsx
export function TiptapEditor({
  content,
  onChange,
  onImageUpload,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Commencez à écrire..." }),
      // Extensions personnalisées
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Gestion upload images
  const handleImageUpload = async (file: File) => {
    const url = await onImageUpload(file);
    editor?.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="editor-container">
      <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />
      <EditorContent editor={editor} className="prose max-w-none" />
    </div>
  );
}
```

## 9. Intégrations Externes

### 9.1 Supabase

#### Configuration Clients

```typescript
// Client côté serveur
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components ne peuvent pas définir de cookies
          }
        },
      },
    }
  );
}

// Client admin (service_role)
export const createSupabaseAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Client navigateur
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 9.2 Stripe

#### Configuration et Webhooks

```typescript
// src/lib/stripe/index.ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});

// src/app/api/stripe-webhook/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")!;
  const event = stripe.webhooks.constructEvent(
    await request.text(),
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      await createOrder({
        userId: session.metadata.userId,
        items: JSON.parse(session.metadata.items),
        amount: session.amount_total,
        stripeSessionId: session.id,
      });
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailure(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### 9.3 Colissimo (Widget Livraison)

```typescript
// src/components/domain/colissimo/ColissimoWidget.tsx
export function ColissimoWidget({
  onPointSelected,
  defaultAddress,
}: ColissimoWidgetProps) {
  useEffect(() => {
    // Injection script Colissimo
    const script = document.createElement("script");
    script.src = "https://ws.colissimo.fr/widget-point-retrait/resources/widget.min.js";
    script.onload = () => {
      window.colissimoWidget?.init({
        ceAddress: defaultAddress,
        callBackFrame: (data: ColissimoPoint) => {
          onPointSelected({
            id: data.identifiant,
            name: data.nom,
            address: data.adresse,
            postalCode: data.codePostal,
            city: data.localite,
            coordinates: {
              lat: data.coordGeolocalisationLatitude,
              lng: data.coordGeolocalisationLongitude,
            },
          });
        },
      });
    };
    document.body.appendChild(script);
  }, []);

  return <div id="colissimo-widget" />;
}
```

## 10. Patterns et Conventions

### 10.1 Conventions de Nommage

```typescript
// Fichiers et dossiers: kebab-case
magazine - actions.ts;
product - card.tsx;
use - cart - hydrated.ts;

// Composants React: PascalCase
export function ProductCard() {}
export function CheckoutButton() {}

// Variables et fonctions: camelCase
const isAuthenticated = true;
function calculateTotal() {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_CART_ITEMS = 100;
const DEFAULT_CURRENCY = "EUR";

// Types et Interfaces: PascalCase
interface CartItem {}
type UserRole = "user" | "admin";

// Actions: suffix avec 'Action'
export async function createProductAction() {}
export async function updateCartAction() {}
```

### 10.2 Structure des Composants

```typescript
// Server Component (défaut)
// src/app/[locale]/products/[slug]/page.tsx
export default async function ProductPage({
  params,
}: {
  params: { slug: string; locale: string };
}) {
  // Data fetching côté serveur
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <ProductDetail product={product} />
      <AddToCartForm productId={product.id} /> {/* Client Component */}
    </div>
  );
}

// Client Component (interactif)
// src/components/domain/shop/add-to-cart-form.tsx
"use client";

import { useFormState } from "react-dom";
import { addItemToCart } from "@/actions/cartActions";

export function AddToCartForm({ productId }: { productId: string }) {
  const [state, formAction] = useFormState(addItemToCart, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="number" name="quantity" defaultValue={1} min={1} />
      <button type="submit">Ajouter au panier</button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

### 10.3 Gestion des Erreurs

```typescript
// Types d'erreurs métier
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Pattern Result pour les actions
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

// Utilisation dans les actions
export async function createProductAction(formData: FormData): Promise<ActionResult<Product>> {
  try {
    // Validation
    const result = ProductSchema.safeParse(formData);
    if (!result.success) {
      return {
        success: false,
        error: "Validation échouée",
        details: result.error.flatten(),
      };
    }

    // Business logic
    const product = await productService.create(result.data);

    return { success: true, data: product };
  } catch (error) {
    if (error instanceof BusinessError) {
      return { success: false, error: error.message };
    }

    console.error("Unexpected error:", error);
    return { success: false, error: "Une erreur inattendue s'est produite" };
  }
}
```

## 11. Performance et Optimisations

### 11.1 Stratégies de Cache

```typescript
// Cache avec tags granulaires
revalidateTag("products"); // Toutes les listes de produits
revalidateTag(`product-${productId}`); // Produit spécifique
revalidateTag(`category-${categoryId}`); // Produits par catégorie

// Cache des requêtes Supabase
export async function getProducts() {
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return data;
}

// Usage avec Next.js cache
import { unstable_cache } from "next/cache";

const getCachedProducts = unstable_cache(async () => getProducts(), ["products"], {
  revalidate: 3600, // 1 heure
  tags: ["products"],
});
```

### 11.2 Optimisation des Images

```typescript
// Configuration Next.js pour Supabase Storage
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

// Utilisation avec next/image
import Image from "next/image";

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={400}
      className="object-cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### 11.3 Bundle Splitting

```typescript
// Lazy loading des composants lourds
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/magazine/tiptap-editor"),
  {
    loading: () => <EditorSkeleton />,
    ssr: false,
  }
);

const ColissimoWidget = dynamic(
  () => import("@/components/domain/colissimo/ColissimoWidget"),
  {
    loading: () => <div>Chargement du widget...</div>,
    ssr: false,
  }
);
```

### 11.4 Edge Runtime

```typescript
// Utilisation du Edge Runtime pour les pages légères
export const runtime = "edge"; // 'nodejs' (default) | 'edge'

// API Route avec Edge Runtime
export async function GET(request: Request) {
  // Pas d'accès aux APIs Node.js
  // Mais performances améliorées
  return new Response(JSON.stringify({ message: "Hello from Edge" }), {
    headers: { "content-type": "application/json" },
  });
}
```

## 12. Sécurité

### 12.1 Validation et Sanitization

```typescript
// Validation avec Zod
const ProductSchema = z.object({
  name: z.string().min(3).max(100),
  price: z.number().positive().max(99999),
  description: z.string().max(5000),
  categoryId: z.string().uuid(),
  images: z.array(z.string().url()).max(10),
});

// Sanitization des entrées HTML
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
```

### 12.2 Protection CSRF

```typescript
// Middleware de sécurité
export async function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Headers de sécurité
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
  );

  return response;
}
```

### 12.3 Audit de Sécurité

```typescript
// Logging des événements de sécurité
export async function logSecurityEvent({
  type,
  userId,
  details,
}: {
  type: SecurityEventType;
  userId: string;
  details: Record<string, any>;
}) {
  await supabase.from("audit_logs").insert({
    event_type: type,
    user_id: userId,
    event_details: details,
    ip_address: request.headers.get("x-forwarded-for"),
    user_agent: request.headers.get("user-agent"),
    created_at: new Date().toISOString(),
  });
}

// Types d'événements
type SecurityEventType =
  | "unauthorized_admin_access"
  | "suspicious_login_attempt"
  | "rate_limit_exceeded"
  | "invalid_token"
  | "data_breach_attempt";
```

## 13. Déploiement et Infrastructure

### 13.1 Architecture de Déploiement

```
┌─────────────────────────────────────────────┐
│              Vercel Edge Network            │
│         (CDN + Edge Functions)              │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│            Next.js Application              │
│         (Serverless Functions)              │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│           External Services                 │
├──────────────┬──────────────┬───────────────┤
│   Supabase   │    Stripe    │   Colissimo   │
│  PostgreSQL  │   Payments   │   Shipping    │
└──────────────┴──────────────┴───────────────┘
```

### 13.2 Variables d'Environnement

```bash
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Application
NEXT_PUBLIC_SITE_URL=https://herbisveritas.com
NODE_ENV=production

# Features Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NEWSLETTER=true
```

### 13.3 Scripts de Déploiement

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "audit-roles": "tsx scripts/audit-roles.ts",
    "migrate:db": "supabase migration up",
    "seed:db": "tsx scripts/seed.ts"
  }
}
```

### 13.4 Monitoring et Observabilité

```typescript
// Intégration avec des services de monitoring
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
});

// Custom metrics
export function trackPerformance(metric: string, value: number) {
  // Send to analytics service
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "timing_complete", {
      name: metric,
      value: Math.round(value),
    });
  }
}
```

## Conclusion

L'architecture actuelle d'Herbisveritas représente un équilibre optimal entre simplicité et fonctionnalité. Le refactoring depuis une architecture DDD complexe vers une approche pragmatique a permis de :

1. **Réduire la complexité** : -70% de fichiers, code plus lisible
2. **Améliorer les performances** : Server Components, Edge Runtime
3. **Faciliter la maintenance** : Moins d'abstractions, patterns standards
4. **Accélérer le développement** : Conventions claires, moins de boilerplate

Cette architecture est conçue pour évoluer avec les besoins du projet tout en restant maintenable et performante. Les principes de co-location, server-first et pragmatisme garantissent que le code reste aligné avec les best practices de Next.js tout en répondant aux besoins métier spécifiques d'une plateforme e-commerce moderne.

### Points Forts

- ✅ Architecture alignée avec Next.js 15
- ✅ Excellent Time to First Byte (TTFB) avec Server Components
- ✅ État client minimal avec Zustand
- ✅ Type safety end-to-end avec TypeScript et Zod
- ✅ Sécurité renforcée avec RLS et validation

### Axes d'Amélioration Futurs

- 📈 Migration vers React 19 features (use, Suspense amélioré)
- 📈 Implémentation de Partial Prerendering (PPR)
- 📈 Tests E2E plus complets avec Playwright
- 📈 Observabilité avancée avec OpenTelemetry
- 📈 Progressive Web App (PWA) capabilities

---

_Documentation générée le 09/08/2025 - Version 2.0 post-refactoring_
