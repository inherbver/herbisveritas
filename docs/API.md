# API Reference

## Overview

HerbisVeritas uses Next.js Server Actions for all API operations, providing secure, type-safe endpoints with built-in validation, error handling, and authentication. The system includes integration with Stripe for payments, Colissimo for shipping, and comprehensive admin management.

## Architecture Principles

- **Input Validation**: Zod schemas validate all inputs with custom error handling
- **Error Handling**: Standardized ActionResult return types with Clean Architecture patterns
- **Authentication**: Automatic session verification via Supabase with role-based permissions
- **Audit Logging**: All critical operations logged to audit_logs table with detailed context
- **Type Safety**: Full TypeScript typing throughout with strict mode enabled
- **Permission System**: Fine-grained permissions with `withPermissionSafe` wrapper
- **Clean Architecture**: Service layer separation with dedicated business logic

## Common Types

### ActionResult

Standard return type for all Server Actions:

```typescript
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  validationErrors?: Record<string, string[]>;
}
```

### Authentication Context

Protected actions include user context with logging:

```typescript
interface AuthContext {
  userId: string;
  email: string;
  role: "user" | "admin" | "editor" | "dev";
  session: Session;
}

// Enhanced logging context
interface UserActionContext {
  userId: string;
  action: string;
  module: string;
  metadata?: Record<string, unknown>;
}
```

## Authentication API

### loginAction

Authenticates user and migrates guest cart with security logging.

```typescript
async function loginAction(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Form Fields**:

- `email`: Valid email format with XSS sanitization
- `password`: Minimum 8 characters with rate limiting

**Security Features**:

- Failed login attempts logged to audit_logs
- Guest cart migration on successful authentication
- Session refresh and CSRF protection
- IP-based rate limiting (5 attempts per 15 minutes)

**Returns**: Redirects to `/profile/account` on success

### signUpAction

Registers new user with email verification and profile creation.

```typescript
async function signUpAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Form Fields**:

- `email`: Valid, unique email with domain validation
- `password`: 8+ chars with uppercase, lowercase, number, special char
- `confirmPassword`: Must match password exactly
- `locale`: User's preferred language (fr, en, de, es)

**Business Logic**:

- Automatic profile creation with role assignment
- Welcome email sending via Edge Functions
- Newsletter subscription opt-in handling

### requestPasswordResetAction

Sends password reset email with security measures.

```typescript
async function requestPasswordResetAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Security**: Always returns success (prevents email enumeration)
**Rate Limiting**: 3 requests per hour per IP

### logoutAction

Logs out current user and clears all sessions.

```typescript
async function logoutAction(): Promise<never>;
```

**Behavior**:

- Clears all browser sessions
- Invalidates refresh tokens
- Logs security event
- Redirects to home page

## Shopping Cart API

### addItemToCart

Adds product to cart with stock validation and user session handling.

```typescript
async function addItemToCart(
  prevState: unknown,
  formData: FormData
): Promise<CartActionResult<CartData | null>>;
```

**Form Fields**:

- `productId`: Valid UUID for existing product
- `quantity`: Positive integer (min: 1, max: 99)

**Business Logic**:

- Stock availability validation
- Guest user cart creation with session ID
- Automatic cart merging on user login
- Optimistic UI updates with server reconciliation

**Validation**: Uses `AddToCartInputSchema` with Zod
**RPC Function**: `add_or_update_cart_item` for atomic updates

### updateCartItemQuantity

Updates item quantity with inventory checks.

```typescript
async function updateCartItemQuantity(
  input: UpdateCartItemQuantityInput
): Promise<CartActionResult<CartData | null>>;
```

**Parameters**:

- `cartItemId`: Valid cart item UUID
- `quantity`: Integer (0 removes item, max: 99)

**Features**:

- Real-time stock validation
- Automatic item removal when quantity = 0
- Cart totals recalculation
- Event logging for analytics

### removeItemFromCart

Removes specific item from cart.

```typescript
async function removeItemFromCart(
  input: RemoveFromCartInput
): Promise<CartActionResult<CartData | null>>;
```

**Security**: User can only modify their own cart items
**Logging**: Removal events logged with product details

### getCart

Retrieves current cart with full product details.

```typescript
export async function getCart(): Promise<CartActionResult<CartData | null>>;
```

**Returns**:

```typescript
interface CartData {
  id: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  status: "active" | "processed" | "abandoned";
}
```

**Features**:

- Automatic price updates from product catalog
- Cart expiration handling (30 days)
- Guest cart persistence via session

## Product Management API

### getProducts

Lists products with advanced filtering and pagination.

```typescript
async function getProducts(filters?: {
  category?: string[];
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}): Promise<ActionResult<PaginatedProducts>>;
```

**Features**:

- Full-text search across name, description, and tags
- Category hierarchy filtering
- Price range with currency conversion
- Stock status filtering
- SEO-optimized slugs

### getProductBySlug

Gets single product with related data.

```typescript
async function getProductBySlug(slug: string): Promise<ActionResult<ProductWithDetails>>;
```

**Returns**: Product with variants, images, reviews, and related products
**Caching**: Redis cache with 1-hour TTL
**SEO**: Automatic meta generation

### createProduct (Admin)

Creates new product with comprehensive validation.

```typescript
async function createProduct(formData: FormData): Promise<ActionResult<Product>>;
```

**Form Fields**:

- `name`: Required, 1-255 chars, SEO slug auto-generation
- `description`: Rich text with sanitization
- `price`: Decimal with currency validation
- `category_ids`: Array of valid category UUIDs
- `images`: Multiple file upload (4MB max each)
- `stock_quantity`: Non-negative integer
- `is_active`: Boolean default true

**Business Logic**:

- Image optimization and CDN upload
- SEO slug generation with conflict resolution
- Inventory tracking setup
- Category relationship validation

**Permission**: Requires `products:create` permission
**Audit**: All creation events logged with admin context

### updateProduct (Admin)

Updates existing product with change tracking.

```typescript
async function updateProduct(id: string, formData: FormData): Promise<ActionResult<Product>>;
```

**Features**:

- Differential updates (only changed fields)
- Image replacement with cleanup
- Stock adjustment logging
- Price change notifications
- SEO impact analysis

**Permission**: Requires `products:update` permission
**Versioning**: Product changes tracked in audit_logs

### deleteProduct (Admin)

Soft delete product with dependency checks.

```typescript
async function deleteProduct(id: string): Promise<ActionResult<void>>;
```

**Safety Checks**:

- Active order item validation
- Cart item cleanup
- Image storage cleanup
- Category relationship updates

**Permission**: Requires `products:delete` permission

## Order Management API

### getOrdersListAction (Admin)

Retrieves paginated order list with advanced filters.

```typescript
async function getOrdersListAction(
  options: OrderListOptions = {}
): Promise<OrderActionResult<PaginatedOrderList>>;
```

**Parameters**:

```typescript
interface OrderListOptions {
  filters?: {
    status?: OrderStatus[];
    payment_status?: PaymentStatus[];
    date_from?: string;
    date_to?: string;
    search?: string; // Order number, user email
    min_amount?: number;
    max_amount?: number;
  };
  sort?: {
    field: "created_at" | "total_amount" | "status" | "order_number";
    direction: "asc" | "desc";
  };
  page?: number;
  limit?: number; // Default: 25, Max: 100
}
```

**Features**:

- Full-text search across order numbers and user emails
- Date range filtering with timezone handling
- Multi-status filtering with OR logic
- Amount range filtering
- Efficient pagination with total count

**Permission**: Requires admin role verification
**Performance**: Optimized queries with proper indexing

### getOrderDetailsAction (Admin)

Gets complete order details with relations.

```typescript
async function getOrderDetailsAction(
  orderId: string
): Promise<OrderActionResult<OrderWithRelations>>;
```

**Returns**: Order with user, items, addresses, and payment info
**Includes**: Shipping tracking, pickup point details, audit trail

### updateOrderStatusAction (Admin)

Updates order status with business logic validation.

```typescript
async function updateOrderStatusAction(
  orderId: string,
  updateData: UpdateOrderStatusData
): Promise<OrderActionResult<void>>;
```

**Parameters**:

```typescript
interface UpdateOrderStatusData {
  status: OrderStatus;
  notes?: string;
  tracking_number?: string;
  notify_customer?: boolean;
}
```

**Business Rules**:

- Status transition validation (no backward transitions)
- Automatic timestamp updates
- Customer notification emails
- Inventory adjustments for cancellations

**Audit**: All status changes logged with admin context

### cancelOrderAction (Admin)

Cancels order with proper cleanup and validation.

```typescript
async function cancelOrderAction(orderId: string, reason: string): Promise<OrderActionResult<void>>;
```

**Business Logic**:

- Status validation (cannot cancel delivered/refunded orders)
- Inventory restoration
- Automatic refund initiation if payment succeeded
- Customer notification

### refundOrderAction (Admin)

Processes order refunds with payment integration.

```typescript
async function refundOrderAction(
  orderId: string,
  amount?: number,
  reason?: string
): Promise<OrderActionResult<void>>;
```

**Features**:

- Partial or full refunds
- Stripe integration for payment reversal
- Refund reason tracking
- Automatic status updates

### addTrackingNumberAction (Admin)

Adds shipping tracking information.

```typescript
async function addTrackingNumberAction(
  orderId: string,
  trackingNumber: string,
  carrier?: string
): Promise<OrderActionResult<void>>;
```

**Features**:

- Automatic status update to 'shipped'
- Tracking URL generation for major carriers
- Customer notification with tracking link
- Integration with shipping service APIs

### getOrderStatsAction (Admin)

Retrieves comprehensive order statistics.

```typescript
async function getOrderStatsAction(): Promise<OrderActionResult<OrderStats>>;
```

**Returns**:

```typescript
interface OrderStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_today: number;
  revenue_today: number;
}
```

## Payment Processing API

### createStripeCheckoutSession

Initializes Stripe checkout with comprehensive validation.

```typescript
async function createStripeCheckoutSession(
  shippingAddress: Address,
  billingAddress: Address,
  shippingMethodId: string
): Promise<ActionResult<CheckoutSessionResult>>;
```

**Parameters**:

- Complete address objects with validation
- Shipping method selection
- Cart validation and stock checks

**Business Logic**:

- Address validation and normalization
- Cart total calculation with taxes
- Shipping cost calculation
- Stock availability verification
- User session management (auth + guest)

**Security Features**:

- CSRF protection via session validation
- Address validation against user permissions
- Cart integrity checks
- Rate limiting for checkout attempts

**Returns**:

```typescript
interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  orderId?: string;
}
```

### Stripe Webhook Handler

Processes Stripe webhooks with idempotency and error handling.

```typescript
// Route: /api/stripe-webhook
export async function POST(req: Request): Promise<NextResponse>;
```

**Supported Events**:

- `checkout.session.completed`: Order creation and fulfillment
- `payment_intent.succeeded`: Payment confirmation
- `payment_intent.payment_failed`: Payment failure handling
- `invoice.payment_succeeded`: Subscription renewals

**Business Logic for checkout.session.completed**:

1. Webhook signature verification
2. Idempotency checks (prevent duplicate orders)
3. Cart retrieval and validation
4. Order creation with complete metadata
5. Order items creation with price snapshots
6. Cart cleanup and status updates
7. Customer notification
8. Inventory adjustments

**Error Handling**:

- Comprehensive error logging to audit_logs
- Rollback mechanisms for failed operations
- Retry logic for transient failures
- Dead letter queue for persistent failures

**Security**:

- Webhook signature validation with Stripe secret
- Service role client for bypassing RLS
- Comprehensive audit logging
- Rate limiting and DDoS protection

## User Profile API

### Profile Management

Located in `profileActions.ts` with comprehensive user data management.

**Features**:

- Multi-language profile updates with i18n
- Address synchronization and validation
- Preference management with real-time updates
- Avatar upload with image optimization
- Privacy settings and GDPR compliance

### Address Management

#### addAddress

Adds new address with validation and geocoding.

```typescript
async function addAddress(data: AddressFormData, locale: string): Promise<ActionResult<unknown>>;
```

**Features**:

- Comprehensive address validation with `addressSchema`
- Automatic geocoding for delivery optimization
- Address type classification (shipping, billing, both)
- International address format support
- Profile flag synchronization

#### updateAddress

Updates existing address with security checks.

```typescript
async function updateAddress(
  addressId: string,
  data: AddressFormData,
  locale: string
): Promise<ActionResult<unknown>>;
```

**Security**: User can only modify their own addresses via RLS
**Audit**: Address changes logged for shipping compliance

#### deleteAddress

Removes address with dependency validation.

```typescript
async function deleteAddress(addressId: string): Promise<ActionResult<unknown>>;
```

**Safety Checks**:

- Active order validation
- Default address reassignment
- Cascade cleanup for related data

#### getUserAddresses

Retrieves user's addresses ordered by recency.

```typescript
async function getUserAddresses(): Promise<ActionResult<unknown[]>>;
```

**Optimization**: Cached results with automatic invalidation

## Content Management API

### Newsletter Management

#### subscribeToNewsletter

Public newsletter subscription with spam protection.

```typescript
async function subscribeToNewsletter(formData: FormData): Promise<ActionResult<{ email: string }>>;
```

**Features**:

- Email validation with `newsletterSubscriptionSchema`
- Duplicate subscription handling
- IP and User-Agent tracking for analytics
- Source attribution (footer_form, popup, etc.)
- Comprehensive event logging

**Security**:

- Rate limiting (5 subscriptions per IP per hour)
- Email validation against disposable domains
- CSRF protection via form tokens

#### getNewsletterSubscribers (Admin)

Retrieves all newsletter subscribers with filtering.

```typescript
async function getNewsletterSubscribers(): Promise<ActionResult<NewsletterSubscriber[]>>;
```

**Permission**: Requires admin role verification
**Privacy**: GDPR compliant with data export capabilities

#### getNewsletterStats (Admin)

Comprehensive newsletter analytics.

```typescript
async function getNewsletterStats(): Promise<ActionResult<NewsletterStats>>;
```

**Returns**:

```typescript
interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  inactive_subscribers: number;
  recent_subscriptions: number; // Last 30 days
}
```

#### toggleNewsletterSubscriber (Admin)

Admin control for subscriber status management.

```typescript
async function toggleNewsletterSubscriber(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>>;
```

### Magazine System

Located in `magazineActions.ts` with full CMS capabilities:

**Features**:

- Rich text editing with media embedding
- SEO optimization with meta tags
- Publication scheduling
- Category and tag management
- Multi-author support
- Comment system integration
- Analytics tracking

## Admin Operations API

### User Management

#### getUsers

Retrieves all system users with enhanced data.

```typescript
const getUsers = withPermissionSafe(
  "users:read:all",
  async (): Promise<ActionResult<UserForAdminPanel[]>>
);
```

**Features**:

- Paginated user retrieval (handles large datasets)
- Combined auth.users and profiles data
- Role prioritization (JWT roles override profile roles)
- Activity status tracking
- Comprehensive user statistics

**Permission**: `users:read:all` with admin verification
**Performance**: Batch processing for large user bases

#### deleteUser

Secure user deletion with comprehensive cleanup.

```typescript
const deleteUser = withPermissionSafe(
  "users:delete",
  async ({ userId, reason }: DeleteUserParams): Promise<ActionResult<null>>
);
```

**Safety Features**:

- Self-deletion prevention
- Profile cleanup before auth deletion
- Comprehensive audit logging
- Cascade deletion handling

**Audit**: All deletions logged with reason and admin context

#### getUserStats

Comprehensive user analytics for admin dashboard.

```typescript
const getUserStats = withPermissionSafe(
  "users:read:all",
  async (): Promise<ActionResult<UserStats>>
);
```

**Returns**:

```typescript
interface UserStats {
  total: number;
  active: number;
  suspended: number;
  admins: number;
  editors: number;
  users: number;
  newThisWeek: number;
  activeToday: number;
}
```

### Role Management

#### setUserRole

Secure role assignment with Edge Function integration.

```typescript
const setUserRole = withPermissionSafe(
  "users:update:role",
  async ({ userId, newRole, reason }: SetUserRoleParams): Promise<ActionResult<null>>
);
```

**Security Features**:

- Edge Function call with internal authorization
- JWT metadata updates
- Profile synchronization
- Comprehensive audit trail
- Role transition validation

**Supported Roles**: `user`, `admin`, `dev` (editor via separate actions)
**Integration**: Calls Supabase Edge Function `set-user-role`

### System Monitoring

Admin actions include comprehensive logging and monitoring:

**Features**:

- Real-time operation logging with `LogUtils`
- Performance metrics tracking
- Error categorization and handling
- Security event detection
- Audit trail maintenance

## API Routes

### /api/colissimo-token

Colissimo integration for shipping point selection.

```typescript
export async function POST(request: NextRequest): Promise<NextResponse>;
```

**Environment Modes**:

- **Development**: Returns mock token from `mockColissimoToken`
- **Production**: Calls Supabase Edge Function `colissimo-token`
- **Fallback**: Mock data if configuration missing

**Features**:

- Automatic environment detection
- Graceful fallback to mock data
- Edge Function integration
- Error handling with logging

### /api/stripe-webhook

Stripe webhook handler for payment processing.

```typescript
export async function POST(req: Request): Promise<NextResponse>;
```

**Webhook Events**:

- `checkout.session.completed`: Order creation and fulfillment
- Payment confirmation and order processing
- Automatic cart cleanup
- Customer notification

**Security**: Stripe signature verification with webhook secret

### /api/admin/check-admins

Admin role verification endpoint for system monitoring.

**Features**:

- Admin role validation
- System health checks
- Permission verification
- Audit logging

## Services Layer

### ShippingService

Comprehensive shipping management with Colissimo integration.

**Methods**:

- `savePickupPoint()`: Store selected pickup location
- `getOrderPickupPoint()`: Retrieve order pickup details
- `updateShippingInfo()`: Update tracking and delivery status
- `generateTrackingUrl()`: Create carrier-specific tracking URLs
- `getActiveShippingMethods()`: List available delivery options

**Supported Carriers**: Colissimo, Chronopost, UPS, FedEx, DHL

**Features**:

- Pickup point geocoding and validation
- Automatic tracking URL generation
- Multi-carrier support
- Delivery status synchronization

## Error Handling

### Error Categories

| Category           | Code                  | Description               | HTTP Status |
| ------------------ | --------------------- | ------------------------- | ----------- |
| **Authentication** | `AUTH_REQUIRED`       | Authentication required   | 401         |
|                    | `INVALID_CREDENTIALS` | Invalid login credentials | 401         |
|                    | `SESSION_EXPIRED`     | User session expired      | 401         |
| **Authorization**  | `UNAUTHORIZED`        | Insufficient permissions  | 403         |
|                    | `ROLE_REQUIRED`       | Specific role required    | 403         |
|                    | `ADMIN_ONLY`          | Admin access required     | 403         |
| **Validation**     | `VALIDATION_ERROR`    | Input validation failed   | 400         |
|                    | `INVALID_FORMAT`      | Data format invalid       | 400         |
|                    | `REQUIRED_FIELD`      | Required field missing    | 400         |
| **Business Logic** | `INSUFFICIENT_STOCK`  | Product stock depleted    | 409         |
|                    | `CART_EMPTY`          | Shopping cart is empty    | 409         |
|                    | `ORDER_FINALIZED`     | Order cannot be modified  | 409         |
| **System**         | `NOT_FOUND`           | Resource not found        | 404         |
|                    | `CONFLICT`            | Resource conflict         | 409         |
|                    | `RATE_LIMITED`        | Too many requests         | 429         |
|                    | `SERVER_ERROR`        | Internal server error     | 500         |

### Clean Architecture Error Handling

```typescript
// Custom error classes with context
class ValidationError extends Error {
  constructor(message: string, code: string, context?: any) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
    this.context = context;
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class CheckoutBusinessError extends Error {
  constructor(code: CheckoutErrorCode, message: string) {
    super(message);
    this.name = "CheckoutBusinessError";
    this.code = code;
  }
}
```

## Rate Limiting

### Authentication Limits

- **Login attempts**: 5 per 15 minutes per IP
- **Password reset**: 3 requests per hour per email
- **Registration**: 3 accounts per hour per IP

### API Limits

- **Cart operations**: 60 requests per minute per user
- **Product searches**: 100 requests per minute per IP
- **Newsletter signup**: 5 requests per hour per IP
- **Admin operations**: 1000 requests per hour per admin

### Checkout Limits

- **Stripe sessions**: 10 per hour per user
- **Address validation**: 20 per minute per user
- **Shipping calculations**: 30 per minute per user

## Security Features

### Application Security

- **CSRF Protection**: Next.js built-in protection with SameSite cookies
- **SQL Injection Prevention**: Parameterized queries with Supabase client
- **XSS Protection**: Automatic escaping and Content Security Policy
- **Input Sanitization**: Zod schema validation with custom sanitizers
- **File Upload Security**: Type validation, size limits, virus scanning

### Authentication Security

- **JWT Security**: Short-lived access tokens with refresh rotation
- **Session Management**: Secure session storage with httpOnly cookies
- **Password Security**: Bcrypt hashing with salt rounds
- **Multi-factor Authentication**: TOTP support via Supabase Auth
- **Social Login**: OAuth2 with Google, GitHub, Apple

### API Security

- **Rate Limiting**: IP-based and user-based limits
- **Request Signing**: Webhook signature verification
- **CORS Configuration**: Strict origin validation
- **Header Security**: Security headers via Next.js middleware

### Data Protection

- **Row Level Security**: Database-level access control
- **Data Encryption**: AES-256 encryption for sensitive data
- **GDPR Compliance**: Right to deletion and data export
- **Audit Logging**: Comprehensive security event logging
- **PII Protection**: Personal data anonymization and masking

### Operational Security

- **Environment Isolation**: Separate development/staging/production
- **Secret Management**: Environment variables with rotation
- **Monitoring**: Real-time security event detection
- **Backup Security**: Encrypted backups with retention policies
- **Incident Response**: Automated alerting and response procedures

## Usage Examples

### Modern Cart Management

```typescript
import { addItemToCart } from '@/actions/cartActions'
import { useActionState } from 'react'
import { toast } from '@/components/ui/use-toast'

function ProductCard({ product }: { product: Product }) {
  const [cartState, cartAction] = useActionState(addItemToCart, null)

  // Handle cart response with detailed error handling
  useEffect(() => {
    if (cartState?.success) {
      toast({
        title: "Produit ajouté",
        description: `${product.name} a été ajouté à votre panier`,
      })
    } else if (cartState?.error) {
      toast({
        title: "Erreur",
        description: cartState.error,
        variant: "destructive"
      })
    }
  }, [cartState])

  return (
    <form action={cartAction}>
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="quantity" value="1" />
      <Button type="submit" disabled={!product.in_stock}>
        {product.in_stock ? 'Ajouter au panier' : 'Rupture de stock'}
      </Button>
    </form>
  )
}
```

### Admin Order Management

```typescript
import { updateOrderStatusAction } from '@/actions/orderActions'
import { OrderStatus } from '@/types/orders'

function OrderStatusManager({ order }: { order: OrderWithRelations }) {
  const [isPending, startTransition] = useTransition()

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatusAction(order.id, {
        status: newStatus,
        notes: `Statut mis à jour vers ${newStatus}`,
        notify_customer: true
      })

      if (result.success) {
        toast({
          title: "Statut mis à jour",
          description: result.message
        })
      } else {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive"
        })
      }
    })
  }

  return (
    <Select onValueChange={handleStatusUpdate} disabled={isPending}>
      <SelectTrigger>
        <SelectValue placeholder={ORDER_STATUS_LABELS[order.status]} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
          <SelectItem key={status} value={status}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### Newsletter Subscription with Validation

```typescript
import { subscribeToNewsletter } from '@/actions/newsletterActions'
import { useActionState } from 'react'

function NewsletterForm() {
  const [state, formAction] = useActionState(subscribeToNewsletter, null)
  const [email, setEmail] = useState('')

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Input
          name="email"
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {state?.validationErrors?.email && (
          <p className="text-sm text-red-600 mt-1">
            {state.validationErrors.email[0]}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full">
        S'abonner à la newsletter
      </Button>

      {state?.success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {state.message}
          </AlertDescription>
        </Alert>
      )}

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {state.error}
          </AlertDescription>
        </Alert>
      )}
    </form>
  )
}
```

### Stripe Checkout Integration

```typescript
import { createStripeCheckoutSession } from '@/actions/stripeActions'
import { useRouter } from 'next/navigation'

function CheckoutButton({
  shippingAddress,
  billingAddress,
  shippingMethodId
}: CheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    setIsLoading(true)

    try {
      const result = await createStripeCheckoutSession(
        shippingAddress,
        billingAddress,
        shippingMethodId
      )

      if (result.success && result.data) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.url
      } else {
        toast({
          title: "Erreur de paiement",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erreur inattendue",
        description: "Une erreur est survenue lors de la création de la session de paiement",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirection vers le paiement...
        </>
      ) : (
        'Procéder au paiement'
      )}
    </Button>
  )
}
```

### Admin Permission-Protected Component

```typescript
import { getUsers, deleteUser } from '@/actions/userActions'
import { withPermissionSafe } from '@/lib/auth/server-actions-auth'

// Server Component with permission checking
async function AdminUsersList() {
  const usersResult = await getUsers()

  if (!usersResult.success) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Erreur lors du chargement des utilisateurs: {usersResult.error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>

      <DataTable
        columns={userColumns}
        data={usersResult.data || []}
        searchable
        filterable
      />
    </div>
  )
}

// Client Component for user actions
function UserDeleteButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteUser({ userId, reason })

      if (result.success) {
        toast({
          title: "Utilisateur supprimé",
          description: result.message
        })
        setIsOpen(false)
      } else {
        toast({
          title: "Erreur de suppression",
          description: result.error,
          variant: "destructive"
        })
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L'utilisateur et toutes ses données seront supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="reason">Raison de la suppression</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez pourquoi cet utilisateur est supprimé..."
            required
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!reason.trim() || isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? 'Suppression...' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```
