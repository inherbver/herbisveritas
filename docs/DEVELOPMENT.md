# Development Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- PostgreSQL (via Supabase)
- Stripe account (for payments)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/inherbver/herbisveritas.git
cd herbisveritas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Database Setup

Run migrations:

```bash
npm run supabase:migrate
```

Seed development data (optional):

```bash
npm run seed:db
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Code Style Guidelines

#### TypeScript

- Strict mode enabled
- No `any` types - use proper interfaces
- Prefer type inference where possible

#### Components

- Server Components by default
- Add `"use client"` only when needed
- Co-locate component files with their styles/tests

#### Naming Conventions

- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Server Actions: suffix with `Action`

### Project Structure

```
src/
├── app/[locale]/       # Routes (Server Components)
├── components/
│   ├── common/        # Shared components
│   ├── features/      # Feature-specific
│   ├── forms/         # Form components
│   └── ui/            # Base UI components
├── actions/           # Server Actions
├── services/          # Business logic
├── lib/              # Utilities
├── stores/           # Client state
└── types/            # TypeScript types
```

### Creating Components

#### Server Component (default)

```typescript
// src/app/[locale]/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

#### Client Component

```typescript
// src/components/features/shop/add-to-cart.tsx
"use client";

import { useState } from "react";

export function AddToCart({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <button onClick={() => addToCart(productId, quantity)}>
      Add to Cart
    </button>
  );
}
```

### Server Actions

Create mutations with Server Actions:

```typescript
// src/actions/productActions.ts
"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";

const CreateProductSchema = z.object({
  name: z.string().min(3),
  price: z.number().positive(),
});

export async function createProductAction(formData: FormData) {
  // Validate input
  const result = CreateProductSchema.safeParse({
    name: formData.get("name"),
    price: Number(formData.get("price")),
  });

  if (!result.success) {
    return { error: "Invalid input" };
  }

  // Create product
  const product = await productService.create(result.data);

  // Invalidate cache
  revalidateTag("products");

  return { success: true, data: product };
}
```

### Database Queries

Use Supabase client with proper typing:

```typescript
// src/services/product.service.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getProducts() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
```

### Client State Management

Use Zustand for client-side state:

```typescript
// src/stores/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "cart-storage",
    }
  )
);
```

## Testing

### Unit Tests

```bash
npm run test
```

Tests are located alongside source files in `__tests__` directories.

### E2E Tests

```bash
npm run test:e2e
```

### Type Checking

```bash
npm run typecheck
```

## Common Tasks

### Add a New Page

1. Create route in `src/app/[locale]/your-page/page.tsx`
2. Add translations in `src/i18n/messages/[locale]/`
3. Update navigation if needed

### Add a New Component

1. Create component in appropriate directory
2. Export from index file if needed
3. Add tests in `__tests__` folder

### Add Database Table

1. Create migration in Supabase dashboard
2. Generate types: `npm run supabase:types`
3. Create service in `src/services/`
4. Add RLS policies

### Add Server Action

1. Create action in `src/actions/`
2. Add validation schema
3. Implement business logic
4. Add cache invalidation

## Debugging

### Development Tools

- React Developer Tools
- Redux DevTools (for Zustand)
- Network tab for API calls
- Supabase dashboard for database

### Common Issues

#### Authentication Issues

- Check Supabase Auth settings
- Verify environment variables
- Check RLS policies

#### Build Errors

- Run `npm run typecheck`
- Check for missing imports
- Verify environment variables

#### Database Errors

- Check RLS policies
- Verify Supabase connection
- Check migration status

## Performance Tips

### Use Server Components

- Default to Server Components
- Only use Client Components for interactivity

### Optimize Images

- Use Next.js Image component
- Add blur placeholders
- Lazy load below the fold

### Cache Effectively

- Use cache tags for granular invalidation
- Static generation for marketing pages
- Dynamic rendering with cache for data

## Deployment

### Local Build Test

```bash
npm run build
npm run start
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Stripe webhooks configured
- [ ] Image domains whitelisted
- [ ] Error tracking enabled
- [ ] Analytics configured

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
