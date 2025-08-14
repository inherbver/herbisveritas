# Documentation

## Project Documentation

This directory contains the complete technical documentation for HerbisVeritas - a comprehensive e-commerce platform for natural cosmetics built with Next.js 15 and Supabase.

### Available Documentation

- **[Architecture](./ARCHITECTURE.md)** - System design, component structure, and technical decisions
- **[Development Guide](./DEVELOPMENT.md)** - Setup instructions, workflow, and coding standards
- **[API Reference](./API.md)** - Server Actions documentation and usage examples
- **[Database Schema](./DATABASE.md)** - Complete database structure, RLS policies, and queries
- **[Test Strategy](./TEST_STRATEGY.md)** - Testing approach and implementation plan

### Quick Links

#### For Developers

- [Initial Setup](./DEVELOPMENT.md#initial-setup) - Get started with the project
- [Code Style Guidelines](./DEVELOPMENT.md#code-style-guidelines) - Coding conventions
- [Component Development](./DEVELOPMENT.md#creating-components) - Server/Client component patterns
- [Server Actions](./DEVELOPMENT.md#server-actions) - API mutations and validations
- [Testing](./TEST_STRATEGY.md) - Comprehensive test suite strategy

#### For System Architects

- [System Architecture](./ARCHITECTURE.md#system-architecture) - High-level overview
- [Component Structure](./ARCHITECTURE.md#directory-structure) - Code organization patterns
- [Data Flow Patterns](./ARCHITECTURE.md#data-flow-patterns) - Request/response flows
- [Authentication Architecture](./ARCHITECTURE.md#authentication-architecture) - Security implementation
- [Performance Optimizations](./ARCHITECTURE.md#performance-optimizations) - Caching and optimization strategies

#### For API Integration

- [Authentication API](./API.md#authentication-api) - User authentication and session management
- [E-commerce API](./API.md#e-commerce-functionality) - Product catalog and shopping cart
- [Order Management API](./API.md#order-management-api) - Order processing and fulfillment
- [Admin Operations API](./API.md#admin-operations-api) - Administrative functions
- [Newsletter API](./API.md#newsletter-api) - Newsletter subscription management
- [Magazine API](./API.md#magazine-api) - Editorial content management

#### For Database Management

- [Core Tables](./DATABASE.md#core-tables) - Main database entities
- [Advanced Features](./DATABASE.md#advanced-features) - Newsletter, magazines, markets, partnerships
- [Row Level Security](./DATABASE.md#row-level-security-rls) - Security policies
- [Functions and Triggers](./DATABASE.md#functions-and-triggers) - Database automation
- [Performance Optimization](./DATABASE.md#performance-optimization) - Indexes and monitoring

## Documentation Standards

### Writing Guidelines

- **Clarity**: Use clear, concise language
- **Examples**: Include code examples for complex concepts
- **Updates**: Keep documentation synchronized with code changes
- **Formatting**: Use Markdown with proper heading hierarchy

### File Organization

```
docs/
├── README.md          # This file - documentation index
├── ARCHITECTURE.md    # System design and architecture
├── DEVELOPMENT.md     # Development setup and workflow
├── API.md            # API reference and examples
└── DATABASE.md       # Database schema and queries
```

### Contributing to Documentation

When updating documentation:

1. **Review existing content** - Ensure consistency
2. **Update relevant sections** - Don't leave outdated information
3. **Add examples** - Practical examples improve understanding
4. **Cross-reference** - Link related sections
5. **Version control** - Commit documentation with related code changes

## Additional Resources

### External Documentation

- [Next.js 15 Documentation](https://nextjs.org/docs) - App Router, Server Components, Server Actions
- [Supabase Documentation](https://supabase.com/docs) - Database, Authentication, RLS
- [Stripe Documentation](https://stripe.com/docs) - Payment processing and webhooks
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com) - Reusable component library
- [React Hook Form](https://react-hook-form.com/) - Form handling and validation
- [Zod](https://zod.dev/) - TypeScript schema validation
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Next-Intl](https://next-intl-docs.vercel.app/) - Internationalization

### Internal Resources

- [CLAUDE.md](../CLAUDE.md) - AI assistant guidelines and project patterns
- [README.md](../README.md) - Project overview and quick start guide
- [package.json](../package.json) - Dependencies, scripts, and configurations
- [Migration Files](../supabase/migrations/) - Database schema evolution
- [Test Files](../src/**/__tests__/) - Unit and integration tests

## Support

For documentation issues or questions:

- Create an issue in the GitHub repository
- Contact the development team
- Check the [troubleshooting guide](./DEVELOPMENT.md#debugging)
