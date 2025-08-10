# API Reference

## Overview

HerbisVeritas uses Next.js Server Actions for all API operations, providing secure, type-safe endpoints with built-in validation, error handling, and authentication.

## Architecture Principles

- **Input Validation**: Zod schemas validate all inputs
- **Error Handling**: Standardized ActionResult return types
- **Authentication**: Automatic session verification via Supabase
- **Audit Logging**: Critical operations logged to audit_logs table
- **Type Safety**: Full TypeScript typing throughout

## Common Types

### ActionResult

Standard return type for all Server Actions:

```typescript
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>;
}
```

### Authentication Context

Protected actions include user context:

```typescript
interface AuthContext {
  userId: string;
  email: string;
  role: "user" | "admin" | "editor" | "dev";
  session: Session;
}
```

## Authentication API

### loginAction

Authenticates user and migrates guest cart.

```typescript
async function loginAction(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Form Fields**:

- `email`: Valid email format
- `password`: Minimum 8 characters

**Returns**: Redirects to `/profile/account` on success

### signUpAction

Registers new user with email verification.

```typescript
async function signUpAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Form Fields**:

- `email`: Valid, unique email
- `password`: 8+ chars with uppercase, lowercase, number, special char
- `confirmPassword`: Must match password
- `locale`: User's preferred language (default: 'fr')

### requestPasswordResetAction

Sends password reset email.

```typescript
async function requestPasswordResetAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Security**: Always returns success for security (prevents email enumeration)

### logoutAction

Logs out current user and clears session.

```typescript
async function logoutAction(): Promise<never>;
```

**Behavior**: Clears session and redirects to home

## Shopping Cart API

### addToCartAction

Adds product to cart.

```typescript
async function addToCartAction(
  productId: string,
  quantity: number
): Promise<ActionResult<CartItem>>;
```

### updateQuantityAction

Updates item quantity in cart.

```typescript
async function updateQuantityAction(
  itemId: string,
  quantity: number
): Promise<ActionResult<CartItem>>;
```

### removeFromCartAction

Removes item from cart.

```typescript
async function removeFromCartAction(itemId: string): Promise<ActionResult<null>>;
```

### getCartAction

Retrieves current cart contents.

```typescript
async function getCartAction(): Promise<ActionResult<Cart>>;
```

## Product Management API

### getProducts

Lists products with optional filters.

```typescript
async function getProducts(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}): Promise<ActionResult<Product[]>>;
```

### getProductBySlug

Gets single product details.

```typescript
async function getProductBySlug(slug: string): Promise<ActionResult<Product>>;
```

### createProduct (Admin)

Creates new product.

```typescript
async function createProduct(data: CreateProductData): Promise<ActionResult<Product>>;
```

### updateProduct (Admin)

Updates existing product.

```typescript
async function updateProduct(id: string, data: UpdateProductData): Promise<ActionResult<Product>>;
```

## Order Processing API

### createOrder

Creates order from current cart.

```typescript
async function createOrder(
  shippingAddress: Address,
  billingAddress?: Address
): Promise<ActionResult<Order>>;
```

### getOrders

Lists user's orders.

```typescript
async function getOrders(): Promise<ActionResult<Order[]>>;
```

### getOrderById

Gets order details.

```typescript
async function getOrderById(id: string): Promise<ActionResult<Order>>;
```

### updateOrderStatus (Admin)

Updates order status.

```typescript
async function updateOrderStatus(id: string, status: OrderStatus): Promise<ActionResult<Order>>;
```

## Payment Processing API

### createCheckoutSession

Initializes Stripe checkout.

```typescript
async function createCheckoutSession(
  orderId: string
): Promise<ActionResult<{ sessionUrl: string }>>;
```

### confirmPayment

Confirms payment completion.

```typescript
async function confirmPayment(paymentIntentId: string): Promise<ActionResult<PaymentConfirmation>>;
```

### handleWebhook

Processes Stripe webhooks.

```typescript
async function handleWebhook(payload: string, signature: string): Promise<ActionResult<null>>;
```

## User Profile API

### getProfile

Gets user profile data.

```typescript
async function getProfile(): Promise<ActionResult<Profile>>;
```

### updateProfile

Updates profile information.

```typescript
async function updateProfile(data: UpdateProfileData): Promise<ActionResult<Profile>>;
```

### updatePreferences

Updates user preferences.

```typescript
async function updatePreferences(preferences: UserPreferences): Promise<ActionResult<Profile>>;
```

## Magazine/Blog API

### getArticles

Lists published articles.

```typescript
async function getArticles(filters?: ArticleFilters): Promise<ActionResult<Article[]>>;
```

### getArticleBySlug

Gets article content.

```typescript
async function getArticleBySlug(slug: string): Promise<ActionResult<Article>>;
```

### createArticle (Admin/Editor)

Creates new article.

```typescript
async function createArticle(data: CreateArticleData): Promise<ActionResult<Article>>;
```

### publishArticle (Admin/Editor)

Publishes or unpublishes article.

```typescript
async function publishArticle(id: string, publish: boolean): Promise<ActionResult<Article>>;
```

## Admin Operations API

### getAdminStats

Gets dashboard statistics.

```typescript
async function getAdminStats(): Promise<ActionResult<AdminStats>>;
```

### getAuditLogs

Retrieves security audit logs.

```typescript
async function getAuditLogs(filters?: AuditLogFilters): Promise<ActionResult<AuditLog[]>>;
```

### updateUserRole

Manages user roles.

```typescript
async function updateUserRole(userId: string, role: UserRole): Promise<ActionResult<Profile>>;
```

## Error Codes

| Code               | Description              |
| ------------------ | ------------------------ |
| `AUTH_REQUIRED`    | Authentication required  |
| `UNAUTHORIZED`     | Insufficient permissions |
| `VALIDATION_ERROR` | Input validation failed  |
| `NOT_FOUND`        | Resource not found       |
| `CONFLICT`         | Resource conflict        |
| `RATE_LIMITED`     | Too many requests        |
| `SERVER_ERROR`     | Internal server error    |

## Rate Limiting

- **Authentication**: 5 attempts per 15 minutes
- **Password reset**: 3 requests per hour
- **API calls**: 100 requests per minute

## Security Features

- CSRF protection via Next.js
- SQL injection prevention via parameterized queries
- XSS protection through automatic escaping
- Input sanitization and validation
- Audit logging for sensitive operations

## Usage Examples

### Client Component

```typescript
import { addToCartAction } from '@/actions/cartActions'

function ProductCard({ product }) {
  async function handleAddToCart() {
    const result = await addToCartAction({
      productId: product.id,
      quantity: 1
    })

    if (result.success) {
      toast.success('Added to cart')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <button onClick={handleAddToCart}>
      Add to Cart
    </button>
  )
}
```

### Form with Server Action

```typescript
import { useActionState } from 'react'
import { loginAction } from '@/actions/authActions'

function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null)

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state?.error && <p>{state.error}</p>}
      <button type="submit">Login</button>
    </form>
  )
}
```
