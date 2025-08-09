# Setup Guide

Complete setup instructions for the HerbisVeritas development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Dependency Installation](#dependency-installation)
6. [Development Server](#development-server)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: v18.17.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions

### VS Code Extensions

Install these recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense"
  ]
}
```

## Repository Setup

### 1. Clone the Repository

```bash
# Clone via HTTPS
git clone https://github.com/yourusername/herbisveritas.git

# Or via SSH
git clone git@github.com:yourusername/herbisveritas.git

# Navigate to project directory
cd herbisveritas
```

### 2. Branch Strategy

```bash
# Check current branch
git branch

# Create feature branch
git checkout -b feature/your-feature-name

# Main branches:
# - main: Production code
# - develop: Development integration
# - feature/*: Feature branches
```

## Environment Configuration

### 1. Create Environment Files

```bash
# Copy the example environment file
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local` with your values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin Configuration
ADMIN_PRINCIPAL_ID=uuid-of-admin-user
INTERNAL_FUNCTION_SECRET=random-secret-string
```

### 3. Obtain Credentials

#### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Navigate to Project Settings → API
3. Copy URL and keys

#### Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Navigate to Developers → API keys
3. Copy test mode keys

## Database Setup

### 1. Supabase Project Setup

```sql
-- Run these migrations in Supabase SQL Editor
-- Order matters due to foreign key constraints

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Create orders table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2),
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Create cart_items table
CREATE TABLE cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(user_id, product_id)
);
```

### 2. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Cart items policies
CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  USING (auth.uid() = user_id);
```

### 3. Storage Buckets

```sql
-- Create storage buckets via Supabase Dashboard
-- 1. Navigate to Storage
-- 2. Create these buckets:
--    - products (public)
--    - magazine (public)
--    - avatars (public)
```

## Dependency Installation

### 1. Install Dependencies

```bash
# Install all dependencies
npm install

# This installs:
# - Production dependencies (Next.js, React, Supabase, etc.)
# - Development dependencies (TypeScript, ESLint, Jest, etc.)
# - Husky git hooks
```

### 2. Verify Installation

```bash
# Check installed packages
npm list --depth=0

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities if any
npm audit fix
```

### 3. Generate Types

```bash
# Generate Supabase types
npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/types.ts
```

## Development Server

### 1. Start Development Server

```bash
# Start with Turbo (recommended)
npm run dev

# Server runs on http://localhost:3000
```

### 2. Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run test        # Run Jest tests

# Admin Tools
npm run audit-roles # Audit admin roles
npm run fix-admin-role # Fix admin role issues

# Database
npm run migrate:markets-partners # Run migrations
```

## Verification

### 1. Test Authentication

```javascript
// Create test user in Supabase Dashboard
// Auth → Users → Create User

// Test login at http://localhost:3000/login
```

### 2. Test Database Connection

```javascript
// Check in browser console
// Navigate to any page and check Network tab
// Should see successful Supabase API calls
```

### 3. Test Stripe Integration

```javascript
// Use Stripe test cards
// 4242 4242 4242 4242 - Success
// 4000 0000 0000 0002 - Decline
```

### 4. Run Health Checks

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Build project
npm run build
```

## Troubleshooting

### Common Issues

#### 1. Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Supabase Connection Error

```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL

# Check Supabase project status
# Dashboard → Project Settings → General
```

#### 3. TypeScript Errors

```bash
# Regenerate types
npm run generate:types

# Check tsconfig.json
cat tsconfig.json
```

#### 4. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### 5. Git Hooks Not Working

```bash
# Reinstall Husky
npm run prepare

# Verify hooks
ls -la .husky/
```

### Debug Mode

Enable debug logging:

```javascript
// In .env.local
NODE_ENV=development
DEBUG=*

// In code
console.log('Debug:', process.env.NODE_ENV);
```

### Getting Help

1. Check error messages carefully
2. Review relevant documentation
3. Search existing issues
4. Ask team members
5. Create detailed bug report

## Next Steps

1. Review [Coding Standards](./coding-standards.md)
2. Set up your IDE preferences
3. Run the test suite
4. Create your first feature branch
5. Start developing!

## Additional Resources

- [Next.js Setup](https://nextjs.org/docs/getting-started)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring/)
