# Architecture Documentation

## Overview

HerbisVeritas is an e-commerce platform built with Next.js 15 App Router, featuring a comprehensive admin system, multilingual support, and integration with Supabase, Stripe, and Colissimo shipping. The architecture follows a server-first approach optimized for performance, type safety, and maintainability.

## Core Principles

1. **Server-First Approach**: Maximize Server Components usage with selective client-side interactivity
2. **Type Safety**: End-to-end TypeScript with strict mode, Zod validation, and generated Supabase types
3. **Security**: Row Level Security (RLS) policies, role-based admin system, and comprehensive validation
4. **Performance**: Edge runtime, optimized caching, and image optimization
5. **Maintainability**: Clear separation of concerns with organized component architecture
6. **Internationalization**: Multi-language support with next-intl (French, English, German, Spanish)

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Public Shop   │  │        Admin Panel          │  │
│  │   Multi-lang    │  │    Role-based Access       │  │
│  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                 Next.js 15 App Router                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │       React Server Components (Default)         │  │
│  │   Pages, Layouts, Data Fetching, SEO            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Client Components                      │  │
│  │   Cart (Zustand), Forms, Interactive UI         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │             Server Actions                       │  │
│  │   Form Handling, Mutations, Business Logic      │  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  APPLICATION LAYER                       │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │  Services   │ │ Validators  │ │   Stores (Client)   │ │
│ │  Shipping   │ │    Zod      │ │ Cart, Address, User │ │
│ │  Cart, Auth │ │  Schemas    │ │    (Zustand)        │ │
│ └─────────────┘ └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                   SECURITY LAYER                         │
│   Middleware Auth • RLS Policies • Role Verification    │
├─────────────────────────────────────────────────────────┤
│                   DATA ACCESS LAYER                      │
│           Supabase Client SDK with Type Safety          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                      │
│  Supabase (Auth/DB/Storage) • Stripe • Colissimo        │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

### `/src/app/[locale]`

Next.js 15 App Router with internationalization support:

- **Public Routes**: `/`, `/shop`, `/products/[slug]`, `/magazine`, `/contact`
- **Auth Routes**: `/login`, `/register`, `/profile/*`
- **Admin Routes**: `/admin/*` with role-based access control
- **API Routes**: `/api/stripe-webhook`, `/api/colissimo-token`

### `/src/components`

Organized component architecture:

- **auth/**: Authentication components (`Can`, `can-server`)
- **common/**: Shared UI components (buttons, modals, search, filters)
- **domain/**: Business domain components (checkout, profile, colissimo)
- **features/**: Feature-specific components organized by domain:
  - `admin/`: Complete admin dashboard with sidebar, monitoring, filters
  - `magazine/`: Article management with TipTap editor and image upload
  - `newsletter/`: Newsletter signup and management
  - `shop/`: Product grid, cart, checkout, quantity controls
- **forms/**: Form components with Zod validation
- **layout/**: Page layout components (header, footer, navigation)
- **ui/**: shadcn/ui components with custom additions

### `/src/actions`

Server Actions for secure data mutations:

- `authActions.ts`: Login, register, password management
- `cartActions.ts`: Cart operations with optimistic updates
- `productActions.ts`: Product CRUD with image upload
- `adminActions.ts`: Admin dashboard and user management
- `orderActions.ts`: Order processing and management
- `stripeActions.ts`: Payment processing integration

### `/src/services`

Business logic services:

- `cart.service.ts`: Cart business logic and validation
- `checkout.service.ts`: Checkout orchestration
- `shipping.service.ts`: Colissimo integration and pickup points
- `magazine.service.ts`: Article publication workflows
- `address-validation.service.ts`: Address validation logic

### `/src/stores`

Zustand stores with persistence:

- `cartStore.ts`: Shopping cart state with localStorage sync
- `addressStore.ts`: User addresses management
- `profileStore.ts`: User profile data

### `/src/lib`

Core utilities and configurations:

- **auth/**: Advanced authentication system:
  - `admin-service.ts`: Role-based access control with caching
  - `server-auth.ts`: Server-side authentication utilities
  - `types.ts`: Permission and role definitions
- **supabase/**: Database integration:
  - `client.ts`, `server.ts`, `admin.ts`: Different client configurations
  - `types.ts`: Generated types with utility helpers
- **storage/**: Centralized image upload system
- **stripe/**: Payment processing utilities
- **validators/**: Zod schemas for all data validation
- **core/**: Error handling, logging, and result patterns

### `/src/types`

TypeScript definitions:

- `supabase.ts`: Generated database types
- Domain-specific types: `cart.ts`, `orders.ts`, `magazine.ts`, etc.

### `/src/i18n`

Internationalization setup:

- Translation files for French (default), English, German, Spanish
- Organized by feature/page for maintainability

## Data Flow Patterns

### Read Operations (Server Components)

```
Request → Middleware (Auth/i18n) → Server Component → Supabase Query → SSR HTML
```

### Write Operations (Server Actions)

```
Form Submit → Server Action → Auth Check → Zod Validation → Service Layer → Database Update → Cache Invalidation → Client Update/Redirect
```

### Admin Operations

```
Admin Request → Middleware Auth → Role Verification → Permission Check → Admin Service → Database → Audit Log → Response
```

### Cart Management

```
User Action → Client Component → Zustand Store → Server Action → Database Sync → LocalStorage Update → UI Refresh
```

### Image Upload Flow

```
File Select → Client Upload → Server Action → Auth Check → Validation → Supabase Storage → URL Generation → Database Update
```

### Payment Flow

```
Checkout → Cart Validation → Stripe Session → Payment Processing → Webhook → Order Creation → Email Notification → Success Page
```

### Shipping Integration

```
Order Creation → Colissimo API → Pickup Point Selection → Database Storage → Tracking Integration → Customer Notification
```

## Authentication & Authorization Architecture

### Multi-Layer Security

1. **Middleware Layer** (`middleware.ts`):
   - Route protection for `/admin/*` and `/profile/*`
   - Internationalization routing
   - Supabase session validation with timeout handling
   - Automatic redirect to login with return URL

2. **Database Layer**:
   - Row Level Security (RLS) policies on all tables
   - User roles: `user`, `admin`, `super_admin`
   - Permission system with granular access control

3. **Admin System** (`lib/auth/admin-service.ts`):
   - Database-driven role verification with in-memory caching
   - Permission-based access control (`products:update`, `users:manage`, etc.)
   - Security event logging in `audit_logs` table
   - Cache invalidation on role changes

4. **Server Actions Protection**:
   - `withPermissionSafe` wrapper for automatic permission checks
   - User context validation on every mutation
   - Audit logging for sensitive operations

### Permission System

```typescript
// Example permissions
const permissions = {
  "products:update": ["admin", "super_admin"],
  "users:manage": ["super_admin"],
  "content:create": ["admin", "super_admin"],
  "*": ["super_admin"], // Wildcard permission
};
```

### Security Features

- JWT-based authentication with secure cookie storage
- Automatic session refresh and cleanup
- Failed access attempt logging
- Emergency admin fallback system
- CSRF protection via Server Actions

## Performance Optimizations

### Caching Strategy

- **Next.js Cache**: Granular cache tags for targeted invalidation
- **Role Caching**: In-memory admin role caching with TTL (5 minutes)
- **Static Generation**: Product pages, magazine articles
- **Dynamic Rendering**: User-specific data (cart, profile)
- **Edge Runtime**: Lightweight API routes and middleware

### State Management

- **Server State**: Server Components by default, minimal client state
- **Client State**: Zustand stores with persistence:
  - Cart state synchronized with database
  - Address management with optimistic updates
  - Profile data caching

### Image Optimization

- **Centralized Upload System**: `lib/storage/image-upload.ts`
- **Supabase Storage**: CDN-backed image storage
- **Next.js Image**: Automatic optimization with WebP conversion
- **File Validation**: Size limits (4MB), format restrictions
- **Lazy Loading**: Progressive image loading with placeholders

### Code Splitting

- **Route-based**: Automatic splitting by Next.js App Router
- **Component-level**: Dynamic imports for heavy components (TipTap editor)
- **Admin Bundle**: Separate bundle for admin functionality
- **Lazy Components**: Chart libraries, rich text editors loaded on demand

### Database Optimization

- **Connection Pooling**: Supabase handles connection management
- **Query Optimization**: Selective field queries, pagination
- **RLS Performance**: Efficient policy design
- **Indexes**: Proper indexing on frequently queried fields

## Security Measures

### Input Validation

- **Comprehensive Zod Schemas**: All user inputs validated (`lib/validators/`)
- **File Upload Validation**: Size, type, and malware scanning
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Protection**: Next.js built-in sanitization

### Authentication & Session Management

- **Supabase Auth**: JWT-based with automatic refresh
- **Secure Cookies**: HttpOnly, SameSite=Lax, Secure in production
- **Session Timeout**: Automatic cleanup and re-authentication
- **Password Security**: Bcrypt hashing, strength validation

### Data Protection

- **Row Level Security**: Comprehensive RLS policies on all tables
- **API Key Security**: Service role key server-side only
- **CORS Configuration**: Restricted origins in production
- **Rate Limiting**: Built-in Supabase rate limiting

### Admin Security

- **Role-based Access**: Database-verified admin roles
- **Permission Granularity**: Fine-grained permission system
- **Audit Logging**: All admin actions logged with context
- **Security Monitoring**: Failed access attempt tracking

### Additional Security

- **Environment Variables**: Secure configuration management
- **HTTPS Enforcement**: Automatic HTTPS in production
- **Content Security Policy**: Configured for external resources
- **Error Handling**: No sensitive data in error messages

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│               Vercel Edge Network                │
│            (CDN + Edge Functions)               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│            Next.js Application                  │
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Server Functions│  │   Static Assets     │  │
│  │   (Serverless)  │  │  (Images, CSS, JS)  │  │
│  └─────────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────┐ │
│  │           API Routes & Server Actions       │ │
│  │     Stripe Webhooks, Auth Callbacks         │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              External Services                  │
│  ┌─────────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Supabase   │ │  Stripe  │ │  Colissimo  │  │
│  │ Auth/DB/    │ │ Payments │ │  Shipping   │  │
│  │ Storage     │ │          │ │   API       │  │
│  └─────────────┘ └──────────┘ └─────────────┘  │
└─────────────────────────────────────────────────┘
```

### Environment Configuration

- **Production**: Vercel with environment variables
- **Development**: Local development with Supabase local
- **Staging**: Branch deployments for testing
- **Monitoring**: Built-in Vercel analytics and logging

## Key Design Decisions

### 1. Server-First Architecture

- **Server Components by Default**: Maximize server rendering for performance and SEO
- **Selective Client Components**: Only when interactivity is required
- **Server Actions**: Prefer over API routes for form handling and mutations

### 2. Type Safety Throughout

- **Generated Supabase Types**: Direct database type usage with utility helpers
- **Zod Validation**: Runtime and compile-time type safety
- **TypeScript Strict Mode**: Zero tolerance for `any` types

### 3. Component Organization

- **Domain-Driven Structure**: Components organized by business domain
- **Composition over Inheritance**: Flexible component composition patterns
- **Single Responsibility**: Each component has a clear, focused purpose

### 4. State Management Strategy

- **Server State First**: Leverage Server Components for data fetching
- **Zustand for Client State**: Lightweight with automatic persistence
- **Optimistic Updates**: Immediate UI feedback with server synchronization

### 5. Security by Design

- **Defense in Depth**: Multiple security layers (middleware, RLS, validation)
- **Principle of Least Privilege**: Granular permission system
- **Audit Everything**: Comprehensive logging for security events

### 6. Developer Experience

- **Clear File Organization**: Intuitive directory structure
- **Comprehensive Testing**: Unit and integration tests with MSW
- **ESLint Enforcement**: Zero-error policy with strict rules
- **Documentation**: Code comments and architectural documentation

## Technology Stack Summary

### Core Framework

- **Next.js 15**: App Router, Server Components, Server Actions
- **React 18**: Concurrent features, Suspense, Error Boundaries
- **TypeScript**: Strict mode with comprehensive type coverage

### Backend & Database

- **Supabase**: PostgreSQL, Authentication, Storage, RLS
- **Server Actions**: Form handling and data mutations
- **Edge Runtime**: Lightweight serverless functions

### Styling & UI

- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible, customizable component library
- **Responsive Design**: Mobile-first approach

### State Management

- **Zustand**: Client-side state with persistence
- **React Hook Form**: Form state management
- **React Query**: (Future consideration for server state)

### External Integrations

- **Stripe**: Payment processing with webhooks
- **Colissimo**: French postal service integration
- **TipTap**: Rich text editor for magazine content
- **next-intl**: Internationalization support

## Future Considerations

### Short Term (Next 6 months)

- Enhanced monitoring with Vercel Analytics
- Performance optimization with Partial Prerendering
- Mobile app considerations (React Native)
- Advanced search functionality

### Medium Term (6-12 months)

- Migration to React 19 features when stable
- Real-time features with Supabase Realtime
- Advanced analytics dashboard
- API rate limiting and quotas

### Long Term (12+ months)

- Microservices architecture consideration
- Multi-tenant support
- Advanced caching strategies (Redis)
- Internationalization expansion
- Progressive Web App capabilities
