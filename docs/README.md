# Documentation

## Project Documentation

This directory contains the complete technical documentation for HerbisVeritas.

### Available Documentation

- **[Architecture](./ARCHITECTURE.md)** - System design, patterns, and technical decisions
- **[Development Guide](./DEVELOPMENT.md)** - Setup instructions, workflow, and coding standards
- **[API Reference](./API.md)** - Server Actions documentation and usage examples
- **[Database Schema](./DATABASE.md)** - Complete database structure, RLS policies, and queries

### Quick Links

#### For Developers

- [Initial Setup](./DEVELOPMENT.md#initial-setup) - Get started with the project
- [Code Style Guidelines](./DEVELOPMENT.md#code-style-guidelines) - Coding conventions
- [Common Tasks](./DEVELOPMENT.md#common-tasks) - Frequent development operations
- [Testing](./DEVELOPMENT.md#testing) - Test suite documentation

#### For System Architects

- [System Architecture](./ARCHITECTURE.md#system-architecture) - High-level overview
- [Data Flow Patterns](./ARCHITECTURE.md#data-flow-patterns) - Request/response flows
- [Performance Optimizations](./ARCHITECTURE.md#performance-optimizations) - Caching and optimization strategies
- [Security Measures](./ARCHITECTURE.md#security-measures) - Authentication and data protection

#### For API Integration

- [Authentication API](./API.md#authentication-api) - User authentication endpoints
- [Shopping Cart API](./API.md#shopping-cart-api) - Cart management
- [Order Processing API](./API.md#order-processing-api) - Order creation and management
- [Payment Processing API](./API.md#payment-processing-api) - Stripe integration

#### For Database Management

- [Core Tables](./DATABASE.md#core-tables) - Main database entities
- [Row Level Security](./DATABASE.md#row-level-security-rls) - Security policies
- [Maintenance](./DATABASE.md#maintenance) - Cleanup and optimization
- [Common Queries](./DATABASE.md#common-queries) - Useful SQL examples

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

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Internal Resources

- [CLAUDE.md](../CLAUDE.md) - AI assistant guidelines
- [README.md](../README.md) - Project overview
- [package.json](../package.json) - Dependencies and scripts

## Support

For documentation issues or questions:

- Create an issue in the GitHub repository
- Contact the development team
- Check the [troubleshooting guide](./DEVELOPMENT.md#debugging)
