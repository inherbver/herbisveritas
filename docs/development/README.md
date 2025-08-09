# Development Documentation

Welcome to the HerbisVeritas development documentation. This guide provides comprehensive information for developers working on the platform.

## Quick Links

- [Setup Guide](./setup.md) - Complete environment setup
- [Coding Standards](./coding-standards.md) - Code style and conventions
- [Testing Guide](./testing.md) - Testing strategy and tools
- [Debugging Guide](./debugging.md) - Debugging techniques
- [Contributing Guide](./contributing.md) - How to contribute

## Platform Overview

HerbisVeritas is a modern e-commerce platform built with:

- **Next.js 15** - React framework with App Router
- **Supabase** - Backend as a Service (PostgreSQL, Auth, Storage)
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Stripe** - Payment processing

## Architecture Summary

The platform follows a pragmatic architecture pattern with:

1. **Server-First Approach**: Server Components by default, Client Components for interactivity
2. **Three-Layer Architecture**: Actions → Services → Repositories
3. **Domain-Driven Structure**: Code organized by business domains
4. **Type Safety**: End-to-end TypeScript with Zod validation

## Directory Structure

```
src/
├── app/[locale]/          # Next.js App Router with i18n
├── components/            # React components
│   ├── admin/            # Admin panel components
│   ├── auth/             # Authentication components
│   ├── domain/           # Business domain components
│   ├── layout/           # Layout and navigation
│   ├── ui/               # shadcn/ui components
│   └── shared/           # Reusable components
├── actions/              # Server Actions
├── lib/                  # Core business logic
│   ├── actions/          # Domain-specific actions
│   ├── services/         # Business services
│   ├── auth/             # Authentication utilities
│   ├── supabase/         # Database clients
│   └── validators/       # Zod schemas
├── stores/               # Zustand state stores
├── types/                # TypeScript definitions
└── middleware.ts         # Route protection
```

## Key Features

### Authentication & Authorization

- Supabase Auth with Row Level Security (RLS)
- Role-based access control (admin, user)
- Protected routes via middleware
- Security audit logging

### E-commerce

- Product catalog with categories
- Shopping cart with persistence
- Stripe payment integration
- Order management system

### Content Management

- Magazine/blog system
- Rich text editor (TipTap)
- Image optimization and storage
- SEO optimizations

### Internationalization

- Multi-language support (FR, EN, DE, ES)
- Locale-based routing
- Translated UI components
- Currency formatting

## Development Workflow

1. **Local Development**

   ```bash
   npm run dev
   ```

2. **Code Quality**

   ```bash
   npm run lint
   npm run test
   ```

3. **Building**

   ```bash
   npm run build
   ```

4. **Production**
   ```bash
   npm start
   ```

## Getting Started

1. Read the [Setup Guide](./setup.md) for environment configuration
2. Review [Coding Standards](./coding-standards.md) before writing code
3. Check [Testing Guide](./testing.md) for test requirements
4. Follow [Contributing Guide](./contributing.md) for submission process

## Best Practices

### Performance

- Use Server Components for data fetching
- Implement proper caching strategies
- Optimize images with Next.js Image
- Use Edge Runtime where applicable

### Security

- Never expose service keys on client
- Implement RLS policies on all tables
- Validate all user inputs with Zod
- Log security events for auditing

### Code Quality

- TypeScript strict mode enabled
- No `any` types allowed
- Comprehensive error handling
- Unit tests for critical paths

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

## Support

For questions or issues:

- Check existing documentation
- Review code comments and examples
- Consult team leads for architectural decisions
