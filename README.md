# HerbisVeritas - E-commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple)](https://stripe.com/)

E-commerce platform specializing in natural cosmetics and herbal products, built with modern web technologies focused on simplicity and performance.

## Quick Start

```bash
# Clone repository
git clone https://github.com/inherbver/herbisveritas.git
cd herbisveritas

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and structure
- [Development Guide](./docs/DEVELOPMENT.md) - Setup and development workflow
- [API Reference](./docs/API.md) - Server actions and endpoints
- [Database Schema](./docs/DATABASE.md) - Database structure and relations

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Validation**: Zod
- **Internationalization**: next-intl (FR, EN, DE, ES)

## Project Structure

```
src/
├── app/[locale]/       # Next.js App Router with i18n
├── components/         # React components
│   ├── common/        # Shared components
│   ├── features/      # Feature-specific components
│   ├── forms/         # Form components
│   ├── layout/        # Layout components
│   └── ui/            # shadcn/ui components
├── actions/           # Server Actions
├── lib/              # Utilities and core logic
├── services/         # Business services
├── stores/           # Zustand stores
├── types/            # TypeScript types
└── i18n/             # Translations
```

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run typecheck    # TypeScript checking
```

## License

Proprietary software. All rights reserved.

---

Built with dedication by the InHerbisVeritas Team
