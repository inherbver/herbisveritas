# Coding Standards

Comprehensive coding standards and best practices for the HerbisVeritas platform.

## Table of Contents

1. [Core Principles](#core-principles)
2. [TypeScript Standards](#typescript-standards)
3. [React & Next.js Patterns](#react--nextjs-patterns)
4. [File Organization](#file-organization)
5. [Naming Conventions](#naming-conventions)
6. [Code Style](#code-style)
7. [Error Handling](#error-handling)
8. [Testing Standards](#testing-standards)
9. [Performance Guidelines](#performance-guidelines)
10. [Security Practices](#security-practices)

## Core Principles

### 1. Pragmatic Over Pure

```typescript
// GOOD: Simple, direct solution
export async function getProduct(id: string) {
  const product = await supabase.from("products").select("*").eq("id", id).single();

  return product.data;
}

// AVOID: Over-abstracted solution
export class ProductRepository extends BaseRepository<Product> {
  constructor(private readonly adapter: IDatabaseAdapter) {
    super(adapter, "products");
  }
  // ... 100 lines of abstraction
}
```

### 2. Server-First Architecture

```typescript
// GOOD: Server Component by default
export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);
  return <ProductDisplay product={product} />;
}

// Only add 'use client' when needed for interactivity
'use client';
export function AddToCartButton({ productId }: Props) {
  const [loading, setLoading] = useState(false);
  // Interactive logic here
}
```

### 3. Co-location of Concerns

```typescript
// GOOD: Single service for domain
export class MagazineService {
  async createArticle(data: CreateArticleData): Promise<Article>;
  async updateArticle(id: string, data: UpdateData): Promise<Article>;
  async publishArticle(id: string): Promise<Article>;
  async searchArticles(query: string): Promise<Article[]>;
}

// AVOID: Multiple micro-services
export class ArticleCrudService {}
export class ArticleSearchService {}
export class ArticlePublishService {}
```

## TypeScript Standards

### Type Definitions

```typescript
// GOOD: Explicit, meaningful types
interface CreateProductData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: ProductCategory;
}

type ProductCategory = "herbs" | "teas" | "supplements";

// AVOID: Any types or loose definitions
interface ProductData {
  [key: string]: any;
}
```

### Utility Types

```typescript
// Use TypeScript utility types effectively
type PartialProduct = Partial<Product>;
type RequiredProduct = Required<Product>;
type ReadonlyProduct = Readonly<Product>;
type ProductKeys = keyof Product;

// Custom utility types
type Nullable<T> = T | null;
type AsyncResult<T> = Promise<Result<T>>;
```

### Generics

```typescript
// GOOD: Meaningful generic constraints
function processItems<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

// Type guards
function isProduct(item: unknown): item is Product {
  return typeof item === "object" && item !== null && "id" in item && "name" in item;
}
```

## React & Next.js Patterns

### Server Components

```tsx
// app/[locale]/products/[id]/page.tsx
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/services/product.service";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <ProductDetails product={product} />
      <AddToCartButton productId={product.id} />
    </div>
  );
}
```

### Client Components

```tsx
"use client";

import { useState, useTransition } from "react";
import { addToCartAction } from "@/actions/cartActions";

export function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = () => {
    startTransition(async () => {
      await addToCartAction(productId, quantity);
    });
  };

  return (
    <button onClick={handleSubmit} disabled={isPending} className="btn-primary">
      {isPending ? "Adding..." : "Add to Cart"}
    </button>
  );
}
```

### Server Actions

```typescript
// actions/cartActions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(1).max(99),
});

export async function addToCartAction(productId: string, quantity: number): Promise<ActionResult> {
  try {
    // 1. Validate input
    const validated = AddToCartSchema.parse({ productId, quantity });

    // 2. Check authentication
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // 3. Business logic
    const cartItem = await cartService.addItem(user.id, validated.productId, validated.quantity);

    // 4. Revalidate cache
    revalidatePath("/cart");

    return { success: true, data: cartItem };
  } catch (error) {
    console.error("Add to cart error:", error);
    return { success: false, error: "Failed to add item" };
  }
}
```

## File Organization

### Directory Structure

```
src/
├── app/[locale]/              # Pages and layouts
│   ├── (shop)/               # Route groups
│   │   ├── products/
│   │   └── cart/
│   └── admin/                # Admin routes
├── components/               # React components
│   ├── domain/              # Business components
│   │   ├── shop/
│   │   ├── checkout/
│   │   └── auth/
│   └── ui/                  # Generic UI components
├── lib/                     # Core business logic
│   ├── actions/            # Domain actions
│   ├── services/           # Business services
│   ├── repositories/       # Data access
│   └── validators/         # Zod schemas
└── types/                  # TypeScript definitions
```

### File Naming

```typescript
// Files: kebab-case
cart-service.ts
product-card.tsx
auth-actions.ts

// React Components: PascalCase files
ProductCard.tsx
CheckoutForm.tsx

// Test files: adjacent to source
cart-service.ts
cart-service.test.ts

// Index files for exports
services/
├── index.ts
├── cart.service.ts
└── product.service.ts
```

## Naming Conventions

### Variables and Functions

```typescript
// camelCase for variables and functions
const productCount = 10;
const isAuthenticated = true;

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// SCREAMING_SNAKE_CASE for constants
const MAX_CART_ITEMS = 100;
const DEFAULT_CURRENCY = "EUR";
const API_TIMEOUT = 5000;
```

### Classes and Types

```typescript
// PascalCase for classes and types
class ProductService {
  // Class implementation
}

interface Product {
  id: string;
  name: string;
}

type OrderStatus = "pending" | "processing" | "completed";

enum PaymentMethod {
  Card = "CARD",
  PayPal = "PAYPAL",
  BankTransfer = "BANK_TRANSFER",
}
```

### React Components

```tsx
// PascalCase for components
export function ProductCard({ product }: ProductCardProps) {
  return <div>{product.name}</div>;
}

// Props interfaces
interface ProductCardProps {
  product: Product;
  onAddToCart?: (id: string) => void;
}

// Custom hooks: use prefix
function useCart() {
  return useStore((state) => state.cart);
}
```

## Code Style

### Imports

```typescript
// Order: external → internal → relative
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types/product";

import { formatPrice } from "./utils";
```

### Functions

```typescript
// GOOD: Clear, single responsibility
export async function getPublishedArticles(
  limit: number = 10,
  offset: number = 0
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new DatabaseError(error.message);
  return data || [];
}

// AVOID: Multiple responsibilities
export async function handleArticles(action: string, data?: any) {
  switch (action) {
    case "get": // ...
    case "create": // ...
    case "update": // ...
    // Too many responsibilities
  }
}
```

### Comments

```typescript
// GOOD: Explain why, not what
// Use optimistic update for better UX while waiting for server
const optimisticCart = [...cart, newItem];
setCart(optimisticCart);

// Business rule: Free shipping over 50€
if (total >= 50) {
  shipping = 0;
}

// AVOID: Obvious comments
// Set loading to true
setLoading(true);

// Increment counter
counter++;
```

## Error Handling

### Custom Error Classes

```typescript
// lib/core/errors.ts
export class BusinessError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}
```

### Error Handling Patterns

```typescript
// In services
export class CartService {
  async addItem(userId: string, productId: string, quantity: number) {
    // Validate business rules
    const product = await this.getProduct(productId);
    if (!product) {
      throw new BusinessError("Product not found", "PRODUCT_NOT_FOUND");
    }

    if (product.stock < quantity) {
      throw new BusinessError("Insufficient stock", "INSUFFICIENT_STOCK");
    }

    // Proceed with operation
    return await this.repository.addItem(userId, productId, quantity);
  }
}

// In actions
export async function addToCartAction(data: FormData) {
  try {
    const result = await cartService.addItem(userId, productId, quantity);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BusinessError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    console.error("Unexpected error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
```

## Testing Standards

### Unit Tests

```typescript
// cart.service.test.ts
import { CartService } from "./cart.service";
import { BusinessError } from "@/lib/core/errors";

describe("CartService", () => {
  let service: CartService;
  let mockRepository: jest.Mocked<CartRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new CartService(mockRepository);
  });

  describe("addItem", () => {
    it("should add item to cart successfully", async () => {
      const mockProduct = { id: "1", stock: 10 };
      mockRepository.getProduct.mockResolvedValue(mockProduct);
      mockRepository.addItem.mockResolvedValue({ id: "1", quantity: 2 });

      const result = await service.addItem("user1", "1", 2);

      expect(result).toEqual({ id: "1", quantity: 2 });
      expect(mockRepository.addItem).toHaveBeenCalledWith("user1", "1", 2);
    });

    it("should throw error for insufficient stock", async () => {
      const mockProduct = { id: "1", stock: 1 };
      mockRepository.getProduct.mockResolvedValue(mockProduct);

      await expect(service.addItem("user1", "1", 5)).rejects.toThrow(BusinessError);
    });
  });
});
```

### Integration Tests

```typescript
// checkout.integration.test.ts
import { createServerClient } from "@/lib/supabase/server";

describe("Checkout Flow", () => {
  it("should complete checkout successfully", async () => {
    // Setup
    const user = await createTestUser();
    const product = await createTestProduct();

    // Add to cart
    await cartService.addItem(user.id, product.id, 1);

    // Process checkout
    const order = await checkoutService.processCheckout(user.id, {
      paymentMethod: "card",
      shippingAddress: testAddress,
    });

    // Verify
    expect(order.status).toBe("pending");
    expect(order.total).toBe(product.price);
  });
});
```

## Performance Guidelines

### Optimization Patterns

```typescript
// 1. Use Server Components for data fetching
export default async function ProductList() {
  const products = await getProducts(); // Fetched on server
  return <ProductGrid products={products} />;
}

// 2. Implement proper caching
import { unstable_cache } from 'next/cache';

export const getCachedProducts = unstable_cache(
  async () => getProducts(),
  ['products'],
  {
    revalidate: 3600, // 1 hour
    tags: ['products']
  }
);

// 3. Optimize images
import Image from 'next/image';

export function ProductImage({ src, alt }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      loading="lazy"
      placeholder="blur"
      blurDataURL={generateBlurDataURL()}
    />
  );
}

// 4. Code splitting with dynamic imports
const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

### Database Queries

```typescript
// GOOD: Efficient queries
const products = await supabase
  .from("products")
  .select("id, name, price, image_url") // Select only needed fields
  .eq("status", "active")
  .limit(20);

// AVOID: N+1 queries
for (const product of products) {
  const reviews = await getReviews(product.id); // N+1 problem
}

// Better: Join or batch fetch
const productsWithReviews = await supabase
  .from("products")
  .select(
    `
    *,
    reviews (
      rating,
      comment
    )
  `
  )
  .eq("status", "active");
```

## Security Practices

### Input Validation

```typescript
// Always validate user input
import { z } from "zod";

const CreateProductSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000),
  price: z.number().positive().max(99999),
  category: z.enum(["herbs", "teas", "supplements"]),
});

export async function createProduct(data: unknown) {
  // Validate input
  const validated = CreateProductSchema.parse(data);

  // Sanitize HTML content
  const sanitizedDescription = sanitizeHtml(validated.description);

  // Process with validated data
  return await productService.create({
    ...validated,
    description: sanitizedDescription,
  });
}
```

### Authentication & Authorization

```typescript
// Check authentication in server actions
export async function deleteProduct(id: string) {
  // Authentication check
  const user = await getUser();
  if (!user) {
    throw new AuthenticationError();
  }

  // Authorization check
  const isAdmin = await checkAdminRole(user.id);
  if (!isAdmin) {
    throw new AuthorizationError('Admin access required');
  }

  // Proceed with deletion
  return await productService.delete(id);
}

// RLS policies in Supabase
CREATE POLICY "Only admins can delete products"
ON products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### Sensitive Data

```typescript
// Never expose sensitive data
export async function getUserProfile(id: string) {
  const profile = await getProfile(id);

  // Remove sensitive fields
  const { password_hash, stripe_customer_id, ...safeProfile } = profile;

  return safeProfile;
}

// Use environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error("Stripe key not configured");
}

// Never log sensitive data
console.log("Processing payment for user:", userId); // OK
console.log("Card number:", cardNumber); // NEVER
```

## Code Review Checklist

Before submitting code:

- [ ] TypeScript types are explicit (no `any`)
- [ ] Error handling is comprehensive
- [ ] Server/Client components are correctly used
- [ ] Authentication/Authorization is checked
- [ ] Input validation is implemented
- [ ] No sensitive data is exposed
- [ ] Tests are written and passing
- [ ] Code follows naming conventions
- [ ] Comments explain the why, not what
- [ ] Performance optimizations are applied
- [ ] ESLint shows no errors
- [ ] Code is formatted with Prettier

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Next.js Best Practices](https://nextjs.org/docs/pages/building-your-application/deploying/production-checklist)
- [React Patterns](https://reactpatterns.com/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
