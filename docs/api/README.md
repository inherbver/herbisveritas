# API Reference

Complete API documentation for HerbisVeritas Server Actions.

## Overview

HerbisVeritas uses Next.js Server Actions for all API operations. These server-side functions provide secure, type-safe endpoints for data mutations and queries with built-in validation, error handling, and authentication.

## Architecture

All Server Actions follow these patterns:

- **Input Validation**: Zod schemas validate all inputs
- **Error Handling**: Standardized ActionResult return types
- **Authentication**: Automatic session verification via Supabase
- **Audit Logging**: Critical operations logged to audit_logs table
- **Type Safety**: Full TypeScript typing throughout

## API Endpoints by Domain

### Authentication

**File**: [`auth-actions.md`](./auth-actions.md)

- `loginAction` - User authentication with cart migration
- `signUpAction` - New user registration
- `requestPasswordResetAction` - Password reset email
- `updatePasswordAction` - Update user password
- `resendConfirmationEmailAction` - Resend verification email
- `logoutAction` - User logout

### Shopping Cart

**File**: [`cart-actions.md`](./cart-actions.md)

- `addToCartAction` - Add product to cart
- `updateQuantityAction` - Update item quantity
- `removeFromCartAction` - Remove item from cart
- `clearCartAction` - Clear entire cart
- `getCartAction` - Retrieve cart contents
- `migrateAndGetCart` - Migrate guest cart to user

### Product Management

**File**: [`product-actions.md`](./product-actions.md)

- `getProducts` - List products with filters
- `getProductBySlug` - Get single product details
- `createProduct` - Create new product (admin)
- `updateProduct` - Update product (admin)
- `deleteProduct` - Delete product (admin)
- `toggleProductStatus` - Activate/deactivate product

### Order Processing

**File**: [`order-actions.md`](./order-actions.md)

- `createOrder` - Create order from cart
- `getOrders` - List user orders
- `getOrderById` - Get order details
- `updateOrderStatus` - Update order status (admin)
- `cancelOrder` - Cancel pending order

### Payment Processing

**File**: [`stripe-actions.md`](./stripe-actions.md)

- `createCheckoutSession` - Initialize Stripe checkout
- `retrieveSession` - Get checkout session details
- `createPaymentIntent` - Direct payment intent
- `confirmPayment` - Confirm payment completion
- `handleWebhook` - Process Stripe webhooks

### Address Management

**File**: [`address-actions.md`](./address-actions.md)

- `getAddresses` - List user addresses
- `createAddress` - Add new address
- `updateAddress` - Update existing address
- `deleteAddress` - Remove address
- `setDefaultAddress` - Set primary address

### User Profile

**File**: [`profile-actions.md`](./profile-actions.md)

- `getProfile` - Get user profile data
- `updateProfile` - Update profile information
- `changePassword` - Change account password
- `deleteAccount` - Delete user account
- `updatePreferences` - Update user preferences

### Admin Operations

**File**: [`admin-actions.md`](./admin-actions.md)

- `getAdminStats` - Dashboard statistics
- `getAuditLogs` - Security audit logs
- `updateUserRole` - Manage user roles
- `bulkProductUpdate` - Batch product operations
- `exportData` - Export system data

### Magazine/Blog

**File**: [`magazine-actions.md`](./magazine-actions.md)

- `getArticles` - List published articles
- `getArticleBySlug` - Get article content
- `createArticle` - Create new article (admin)
- `updateArticle` - Edit article (admin)
- `deleteArticle` - Remove article (admin)
- `publishArticle` - Publish/unpublish article

### Market Management

**File**: [`market-actions.md`](./market-actions.md)

- `getMarkets` - List active markets
- `getMarketById` - Get market details
- `createMarket` - Add new market (admin)
- `updateMarket` - Update market info (admin)
- `deleteMarket` - Remove market (admin)

### Partner Management

**File**: [`partner-actions.md`](./partner-actions.md)

- `getPartners` - List partner shops
- `getPartnerById` - Get partner details
- `createPartner` - Add new partner (admin)
- `updatePartner` - Update partner info (admin)
- `deletePartner` - Remove partner (admin)

### User Management

**File**: [`user-actions.md`](./user-actions.md)

- `getUsers` - List all users (admin)
- `getUserById` - Get user details (admin)
- `updateUserStatus` - Enable/disable user
- `impersonateUser` - Admin impersonation
- `exportUserData` - GDPR data export

## Common Types

### ActionResult<T>

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

All protected actions include user context:

```typescript
interface AuthContext {
  userId: string;
  email: string;
  role: "user" | "admin";
  session: Session;
}
```

## Error Codes

Standard error codes used across all endpoints:

| Code               | Description                   |
| ------------------ | ----------------------------- |
| `AUTH_REQUIRED`    | Authentication required       |
| `UNAUTHORIZED`     | Insufficient permissions      |
| `VALIDATION_ERROR` | Input validation failed       |
| `NOT_FOUND`        | Resource not found            |
| `CONFLICT`         | Resource conflict (duplicate) |
| `RATE_LIMITED`     | Too many requests             |
| `SERVER_ERROR`     | Internal server error         |

## Rate Limiting

Sensitive endpoints implement rate limiting:

- Authentication: 5 attempts per 15 minutes
- Password reset: 3 requests per hour
- API calls: 100 requests per minute

## Security

All Server Actions implement:

- CSRF protection via Next.js
- SQL injection prevention via parameterized queries
- XSS protection through automatic escaping
- Input sanitization and validation
- Audit logging for sensitive operations

## Testing

Each Server Action includes:

- Unit tests in `__tests__` directories
- Integration tests with database
- Mock implementations for development
- Error scenario coverage

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

### Form with useActionState

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

## Versioning

API versioning strategy:

- Server Actions are versioned with the application
- Breaking changes require migration paths
- Deprecation notices provided 30 days in advance
- Backward compatibility maintained when possible

## Support

For API support and questions:

- Technical documentation: This directory
- GitHub Issues: Report bugs and issues
- Email: support@herbisveritas.com
