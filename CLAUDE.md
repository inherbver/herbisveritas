# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development

- **Start development server**: `npm run dev` (uses Turbo for faster builds)
- **Build production**: `npm run build`
- **Start production**: `npm start`
- **Run tests**: `npm run test`
- **Lint code**: `npm run lint`
- **Format code**: Prettier is configured with lint-staged hooks
- **Admin role audit**: `npm run audit-roles`

### Testing

- Foreach new feature you've to build tests
- Those tests have to passed before commiting
- Jest is configured for unit tests in `__tests__` directories
- Run specific test: `npm test -- --testPathPattern=filename`
- MSW (Mock Service Worker) is available for API mocking

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router and Server Components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand for global state
- **Validation**: Zod schemas with React Hook Form
- **Internationalization**: next-intl with French as default (fr, en, de, es)
- **Payments**: Stripe integration

### Directory Structure

```
src/
├── app/[locale]/          # Next.js App Router with i18n
├── components/            # React components organized by domain
│   ├── admin/            # Admin panel components
│   ├── auth/             # Authentication & authorization
│   ├── domain/           # Business domain components
│   ├── layout/           # Layout and navigation
│   ├── ui/               # shadcn/ui components
│   └── shared/           # Reusable components
├── actions/              # Server Actions for API logic
├── lib/                  # Utilities and services
│   ├── auth/             # Authentication utilities
│   ├── supabase/         # Database clients and queries
│   └── stripe/           # Payment processing
├── stores/               # Zustand state stores
├── types/                # TypeScript type definitions
└── middleware.ts         # Route protection and i18n
```

### Key Patterns

#### Authentication & Authorization

- Row Level Security (RLS) policies on all Supabase tables
- Role-based admin system with database verification
- Middleware handles route protection for `/admin` and `/profile`
- Use `checkAdminRole()` from `@/lib/auth/admin-service` for admin checks
- Security events logged to `audit_logs` table

#### Database Integration

- Use Server Components for data fetching with Supabase
- Client-side: `createClient()` from `@/lib/supabase/client`
- Server-side: `createServerClient()` from `@/lib/supabase/server`
- Admin operations: `createAdminClient()` from `@/lib/supabase/admin`
- Types defined in `@/lib/supabase/types` with utility helpers

#### State Management

- Zustand stores for cart (`cartStore`), addresses (`addressStore`), profile (`profileStore`)
- Server Actions in `/actions` directory for mutations
- Optimistic updates pattern for cart operations

#### Internationalization

- Routes: `/{locale}/path` with French as default
- Translation files in `src/i18n/messages/[locale]/`
- Use `useTranslations()` hook in components
- `params` and `searchParams` are async in Next.js 15 - await them in Server Components

#### Component Architecture

- Server Components by default, add `'use client'` only when needed
- Form validation with Zod schemas in `/lib/validators`
- shadcn/ui components in `/components/ui`
- Domain-specific components organized by feature

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- Absolute imports with `@/` alias
- Tailwind CSS for styling (avoid `@apply` with non-existent classes)
- Follow existing patterns for component structure and naming

### ESLint & Code Quality

- **NEVER use `any` type** - Always define proper TypeScript interfaces/types
- **Unused variables/imports**: Remove completely or prefix with `_` if needed for future use
- **Error handling**: Always use caught errors for logging or prefix with `_error`
- **React Hooks**: Include all dependencies in dependency arrays, use proper cleanup
- **Switch statements**: Wrap case declarations in `{}` blocks to avoid lexical declaration errors
- **Translations**: Always use translation variables (`t`) or remove unused imports
- **Run `npm run lint` before committing** - Zero ESLint errors policy

### Security Considerations

- Never expose `service_role` key in client code
- All database tables protected with RLS policies
- Admin routes require database role verification
- Security events logged for unauthorized access attempts

### Image Upload System

- **Centralized image upload**: Use functions from `@/lib/storage/image-upload`
- **uploadProductImageCore**: For product images (bucket: `products`, permission: `products:update`)
- **uploadMagazineImageCore**: For magazine images (bucket: `magazine`, permission: `content:create`)
- **Validation**: 4MB max, formats JPEG/PNG/WebP/GIF
- **File naming**: Automatic sanitization with `slugify()` and timestamp
- **Permissions**: Integrated with role-based authorization system

### Testing

- Unit tests in `__tests__` directories alongside source files
- Mock Supabase calls using MSW handlers in `/src/mocks`
- Test authentication flows with mocked user sessions
- Image upload functions tested in `productActions.test.ts` and `lib/storage/__tests__/`

### Performance

- Use Edge Runtime where possible (`export const runtime = 'edge'`)
- Image optimization configured for Supabase storage
- Bundle analysis available with `next build --profile`

### Best Practices

- These guidelines extend the above and should be enforced by Claude Code when providing code suggestions:

- No artifacts.

- Less code is better than more code.

No fallback mechanisms—they hide the real errors.

Refactor existing components instead of adding new ones.

Mark deprecated files to keep the codebase lightweight.

Avoid race conditions at all costs.

Always show the full component unless otherwise specified.

Never say “X remains unchanged”—always show the code.

Specify where code snippets belong (e.g., under “abc”, above “xyz”).

If only one function changes, show only that one.

Take your time to think deeply—thinking is cheaper than debugging.
