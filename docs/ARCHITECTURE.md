# Architecture Documentation

## Overview

HerbisVeritas uses a pragmatic server-first architecture with Next.js 15, optimized for performance and maintainability.

## Core Principles

1. **Server-First Approach**: Maximize Server Components usage
2. **Simplicity**: Prefer native Next.js patterns over abstractions
3. **Type Safety**: End-to-end TypeScript with Zod validation
4. **Performance**: Edge runtime and optimized caching
5. **Security**: Row Level Security (RLS) and comprehensive validation

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
├─────────────────────────────────────────────────────────┤
│                   Next.js App Router                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │            React Server Components               │  │
│  │    Pages, Layouts, Server Actions                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │             Client Components                    │  │
│  │    Forms, Cart, Interactive UI                   │  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  BUSINESS LOGIC LAYER                    │
│     Services, Validators (Zod), Stores (Zustand)        │
├─────────────────────────────────────────────────────────┤
│                   DATA ACCESS LAYER                      │
│              Supabase Client SDK (RLS)                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                      │
│   Supabase (DB), Stripe (Payments), Colissimo (Ship)    │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

### `/src/app/[locale]`

Next.js App Router with internationalization. Each route is a Server Component by default.

### `/src/components`

- **common/**: Shared UI components (buttons, modals, etc.)
- **features/**: Domain-specific components (shop, magazine, admin)
- **forms/**: Form components with validation
- **layout/**: Page layout components
- **ui/**: shadcn/ui components

### `/src/actions`

Server Actions for data mutations. Handle form submissions and API calls securely.

### `/src/services`

Business logic services. Encapsulate complex operations and data transformations.

### `/src/lib`

Core utilities, configurations, and helpers:

- **supabase/**: Database client configurations
- **stripe/**: Payment processing setup
- **validators/**: Zod schemas
- **auth/**: Authentication utilities

### `/src/stores`

Zustand stores for client-side state management with persistence.

## Data Flow Patterns

### Read Operations (Server Components)

```
Request → Server Component → Supabase Query → SSR HTML
```

### Write Operations (Server Actions)

```
Form Submit → Server Action → Validation → Business Logic → Database Update → Cache Invalidation → Client Update
```

### Payment Flow

```
Checkout → Stripe Session → Payment Processing → Webhook → Order Creation → Success Page
```

## Authentication Architecture

### Middleware Protection

Routes are protected at the middleware level with role-based access control.

### Row Level Security

Database operations are secured with PostgreSQL RLS policies.

### Admin System

Special role verification through database with caching for performance.

## Performance Optimizations

### Caching Strategy

- Granular cache tags for targeted invalidation
- Static generation where possible
- Dynamic rendering with cache for frequently accessed data

### Image Optimization

- Next.js Image component with automatic optimization
- Supabase Storage integration
- Lazy loading with blur placeholders

### Code Splitting

- Dynamic imports for heavy components
- Route-based code splitting
- Edge runtime for lightweight operations

## Security Measures

### Input Validation

- Zod schemas for all user inputs
- Server-side validation in Server Actions
- Type-safe API boundaries

### Authentication

- JWT-based with Supabase Auth
- Secure cookie storage
- Session validation on sensitive operations

### Data Protection

- Row Level Security policies
- Service role key only on server
- Audit logging for admin actions

## Deployment Architecture

```
Vercel Edge Network (CDN)
         ↓
Next.js Application (Serverless)
         ↓
External Services (Supabase, Stripe, Colissimo)
```

## Key Design Decisions

### Server Components by Default

Leverages React Server Components for better performance and SEO.

### Simplified Service Layer

Single service per domain instead of multiple specialized services.

### Direct Type Usage

Database types used directly without abstraction layers.

### Zustand for Client State

Lightweight state management with built-in persistence.

## Future Considerations

- Migration to React 19 features
- Partial Prerendering (PPR) implementation
- Enhanced observability with OpenTelemetry
- Progressive Web App capabilities
