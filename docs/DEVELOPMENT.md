# HerbisVeritas Development Guide

This comprehensive guide covers the complete development workflow for HerbisVeritas, an e-commerce platform built with Next.js 15, Supabase, and modern web technologies.

## Prerequisites

### System Requirements

- **Node.js 20+** (LTS recommended)
- **npm 9+** (included with Node.js)
- **Git** for version control
- **VS Code** (recommended IDE with extensions)

### External Services

- **Supabase account** (PostgreSQL database, Auth, Storage)
- **Stripe account** (payment processing)
- **Browser** with development tools

## Quick Start

### 1. Clone & Setup

```bash
# Clone repository
git clone https://github.com/inherbver/herbisveritas.git
cd herbisveritas

# Install dependencies
npm install

# Setup Git hooks
npm run prepare
```

### 2. Environment Configuration

Create `.env.local` from template:

```bash
cp .env.example .env.local
```

**Required environment variables:**

```env
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# ===========================================
# STRIPE CONFIGURATION
# ===========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_PRINCIPAL_ID=your-admin-user-uuid
INTERNAL_FUNCTION_SECRET=secure-random-string
```

### 3. Start Development

```bash
# Start development server (with Turbo)
npm run dev

# Visit application
open http://localhost:3000
```

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 15 with App Router and Server Components
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, RLS)
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for client-side state
- **Validation**: Zod schemas with React Hook Form
- **Internationalization**: next-intl (French, English, German, Spanish)
- **Payments**: Stripe integration with webhooks
- **Testing**: Jest, React Testing Library, MSW, Playwright
- **TypeScript**: Strict mode with end-to-end type safety

## Development Workflow

### Available Scripts

```bash
# Development
npm run dev                    # Start development server with Turbo
npm run build                  # Build production bundle
npm start                      # Start production server

# Code Quality
npm run lint                   # ESLint with TypeScript-ESLint
npm run test                   # Jest unit tests
npm run typecheck             # TypeScript compilation check

# Admin Tools
npm run audit-roles           # Audit admin roles security
npm run fix-admin-role        # Fix admin role issues
npm run migrate:markets-partners  # Data migration script
```

### Code Style Guidelines

#### TypeScript Configuration

- **Strict mode enabled** (`strict: true`)
- **No `any` types** - Always define proper interfaces/types
- **Unused variables** - Remove completely or prefix with `_`
- **Error handling** - Use caught errors or prefix with `_error`
- **Target ES2017** with modern browser support

#### Component Architecture

- **Server Components by default** (Next.js 15 App Router)
- Add `"use client"` directive only when needed for interactivity
- **Co-location**: Place tests in `__tests__` directories
- **File organization**: Group by domain/feature, not by type

#### Naming Conventions

- **Files**: `kebab-case.tsx`
- **Components**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Server Actions**: suffix with `Action`
- **Types/Interfaces**: `PascalCase` with descriptive names

### Project Architecture

```
src/
├── app/[locale]/              # Next.js 15 App Router with i18n
│   ├── admin/                 # Protected admin routes
│   ├── auth/                  # Authentication pages
│   ├── shop/                  # E-commerce pages
│   └── api/                   # API routes & webhooks
├── components/                # React components
│   ├── auth/                  # Authentication & authorization
│   ├── common/                # Shared reusable components
│   ├── domain/                # Domain-specific components
│   ├── features/              # Feature modules
│   ├── forms/                 # Form components
│   ├── layout/                # Layout and navigation
│   └── ui/                    # shadcn/ui base components
├── actions/                   # Server Actions for mutations
├── lib/                       # Core utilities and services
│   ├── auth/                  # Authentication utilities
│   ├── supabase/              # Database clients & queries
│   ├── stripe/                # Payment processing
│   ├── storage/               # File upload system
│   └── validators/            # Zod validation schemas
├── services/                  # Business logic services
├── stores/                    # Zustand state management
├── types/                     # TypeScript type definitions
├── hooks/                     # Custom React hooks
├── i18n/                      # Internationalization
└── mocks/                     # MSW test mocks
```

#### Key Architecture Patterns

1. **Server-First**: Leverage Server Components for data fetching
2. **Progressive Enhancement**: Add interactivity only where needed
3. **Type Safety**: End-to-end TypeScript with Supabase types
4. **Domain-Driven**: Organize code by business domains
5. **Security-First**: RLS policies, role-based authorization

### Component Development

#### Server Component Pattern (Default)

```typescript
// src/app/[locale]/products/page.tsx
import { Suspense } from "react";
import { ProductGrid } from "@/components/features/shop/product-grid";
import { getProducts } from "@/lib/supabase/queries/products";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await params/searchParams in Next.js 15
  const { locale } = await params;
  const search = await searchParams;

  const products = await getProducts();

  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading products...</div>}>
        <ProductGrid products={products} />
      </Suspense>
    </main>
  );
}
```

#### Client Component Pattern

```typescript
// src/components/features/shop/add-to-cart.tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/actions/cartActions";

interface AddToCartProps {
  productId: string;
  maxQuantity: number;
}

export function AddToCart({ productId, maxQuantity }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("CartDisplay");

  const handleAddToCart = () => {
    startTransition(async () => {
      const result = await addToCartAction({ productId, quantity });
      if (result.success) {
        toast.success(t("itemAdded"));
      } else {
        toast.error(result.error || t("addError"));
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <QuantityInput
        value={quantity}
        onChange={setQuantity}
        max={maxQuantity}
      />
      <Button
        onClick={handleAddToCart}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? t("adding") : t("addToCart")}
      </Button>
    </div>
  );
}
```

### Server Actions Pattern

Server Actions handle all server-side mutations with validation, authorization, and error handling:

```typescript
// src/actions/productActions.ts
"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { uploadProductImageCore } from "@/lib/storage/image-upload";
import { ActionResult } from "@/lib/core/result";
import { logAdminEvent } from "@/lib/admin/event-logger";

const CreateProductSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  price: z.number().positive("Price must be positive"),
  description: z.string().min(10, "Description too short"),
  categoryId: z.string().uuid("Invalid category"),
  image: z.instanceof(File).optional(),
});

export async function createProductAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // Authorization check
    const adminCheck = await checkAdminRole();
    if (!adminCheck.success) {
      return { success: false, error: "Unauthorized" };
    }

    // Input validation
    const rawData = {
      name: formData.get("name") as string,
      price: Number(formData.get("price")),
      description: formData.get("description") as string,
      categoryId: formData.get("categoryId") as string,
      image: formData.get("image") as File | null,
    };

    const validation = CreateProductSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues.map((i) => i.message).join(", "),
      };
    }

    const data = validation.data;
    const supabase = await createSupabaseServerClient();

    // Handle image upload
    let imageUrl: string | null = null;
    if (data.image) {
      const uploadResult = await uploadProductImageCore(data.image);
      if (!uploadResult.success) {
        return { success: false, error: "Image upload failed" };
      }
      imageUrl = uploadResult.data.url;
    }

    // Create product in database
    const { data: product, error: dbError } = await supabase
      .from("products")
      .insert({
        name: data.name,
        price: data.price,
        description: data.description,
        category_id: data.categoryId,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (dbError) {
      return { success: false, error: "Database error" };
    }

    // Log admin activity
    await logAdminEvent({
      action: "product_created",
      resource_type: "product",
      resource_id: product.id,
      metadata: { name: data.name, price: data.price },
    });

    // Revalidate cache
    revalidateTag("products");
    revalidateTag(`product-${product.id}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error("Create product error:", error);
    return { success: false, error: "Unexpected error" };
  }
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
