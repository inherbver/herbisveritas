# 🌿 HerbisVeritas - E-commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple)](https://stripe.com/)

E-commerce platform for natural cosmetics and herbal products, built with modern web technologies and a focus on simplicity and performance.

## ✨ Features

- 🛒 **E-commerce** - Complete shopping cart and checkout flow
- 💳 **Payments** - Secure Stripe integration
- 📦 **Shipping** - Colissimo widget for delivery options
- 📝 **Magazine** - Blog system with TipTap editor
- 🌍 **i18n** - Multi-language support (FR, EN, DE, ES)
- 👨‍💼 **Admin Panel** - Full dashboard for management
- 🔒 **Security** - JWT auth, RLS, audit logs
- 📱 **Responsive** - Mobile-first design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Stripe account
- Colissimo API access

### Installation

```bash
# Clone the repository
git clone https://github.com/inherbver/herbisveritas.git
cd herbisveritas

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npm run supabase:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Colissimo
NEXT_PUBLIC_COLISSIMO_API_KEY=your_colissimo_key
```

## 📁 Project Structure

```
src/
├── actions/        # Server Actions
├── app/           # Next.js App Router
├── components/    # React Components
├── hooks/         # Custom Hooks
├── lib/           # Utilities & Services
├── stores/        # Zustand Stores
├── types/         # TypeScript Types
└── i18n/          # Translations
```

## 🏗️ Architecture

This project uses a **pragmatic, server-first architecture** with Next.js 15:

- **Server Components** by default for optimal performance
- **Server Actions** for secure mutations
- **Zustand** for client state management
- **Supabase** for database, auth, and storage
- **Zod** for runtime validation

[→ Full Architecture Documentation](./docs/architecture/CURRENT_ARCHITECTURE.md)

## 📚 Documentation

- [Architecture Overview](./docs/architecture/CURRENT_ARCHITECTURE.md)
- [Database Schema](./docs/architecture/database.md)
- [Features Documentation](./docs/features/FEATURES_OVERVIEW.md)
- [Development Guide](./docs/development/README.md)
- [API Documentation](./docs/api/README.md)

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 📦 Deployment

The application is optimized for deployment on Vercel:

```bash
# Build for production
npm run build

# Preview production build
npm run start
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Stripe webhooks configured
- [ ] Image domains whitelisted
- [ ] Security headers configured

## 🛠️ Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking
```

### Code Conventions

- **TypeScript** - Strict mode enabled
- **Components** - Functional with hooks
- **Styling** - Tailwind CSS + shadcn/ui
- **State** - Server state + Zustand for client
- **Validation** - Zod schemas everywhere

## 🔒 Security

- JWT-based authentication
- Row Level Security (RLS) in PostgreSQL
- Input validation with Zod
- CSRF protection
- Rate limiting on sensitive endpoints
- Audit logging for admin actions
- RGPD compliant

## 🌟 Key Technologies

- **[Next.js 15](https://nextjs.org/)** - React framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Supabase](https://supabase.com/)** - Backend as a Service
- **[Stripe](https://stripe.com/)** - Payment processing
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library
- **[Zustand](https://zustand-demo.pmnd.rs/)** - State management
- **[Zod](https://zod.dev/)** - Schema validation
- **[next-intl](https://next-intl-docs.vercel.app/)** - Internationalization

## 📈 Performance

- Lighthouse Score: **95+**
- First Contentful Paint: **< 1.5s**
- Largest Contentful Paint: **< 2.5s**
- Cumulative Layout Shift: **< 0.1**

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) team for the amazing framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [shadcn](https://twitter.com/shadcn) for the UI components
- All contributors and users of HerbisVeritas

---

**Built with ❤️ by InHerbisVeritas Team**

[Website](https://herbisveritas.com) • [Support](mailto:support@herbisveritas.com)
