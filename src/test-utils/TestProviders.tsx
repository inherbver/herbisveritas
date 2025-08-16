/**
 * Providers de test unifiés pour le rendu des composants
 * Combine tous les providers nécessaires (i18n, stores, auth, etc.)
 */

import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { UserFactory, type UserWithProfile } from './factories/UserFactory'
import { CartFactory, type CartWithItems } from './factories/CartFactory'

// Mock des traductions pour les tests
const mockMessages = {
  // Auth
  'Auth.validation.emailAlreadyExists': 'Un compte existe déjà avec cette adresse email.',
  'Auth.validation.genericSignupError': 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
  'Auth.passwordsDoNotMatch': 'Les mots de passe ne correspondent pas.',
  'Auth.UpdatePassword.errorMessage': 'Erreur lors de la mise à jour du mot de passe.',
  'Auth.UpdatePassword.successMessage': 'Mot de passe mis à jour avec succès.',
  
  // Cart
  'Cart.addToCart': 'Ajouter au panier',
  'Cart.removeFromCart': 'Retirer du panier',
  'Cart.updateQuantity': 'Modifier la quantité',
  'Cart.empty': 'Votre panier est vide',
  'Cart.total': 'Total',
  'Cart.checkout': 'Commander',
  
  // Products
  'Products.outOfStock': 'Rupture de stock',
  'Products.inStock': 'En stock',
  'Products.price': 'Prix',
  'Products.addToCart': 'Ajouter au panier',
  
  // Forms
  'Forms.required': 'Ce champ est requis',
  'Forms.email.invalid': 'Email invalide',
  'Forms.password.tooShort': 'Mot de passe trop court',
  'Forms.submit': 'Valider',
  'Forms.cancel': 'Annuler',
  
  // Common
  'Common.loading': 'Chargement...',
  'Common.error': 'Erreur',
  'Common.success': 'Succès',
  'Common.confirm': 'Confirmer',
  'Common.delete': 'Supprimer',
  'Common.edit': 'Modifier',
  'Common.save': 'Enregistrer',
}

interface TestProvidersOptions {
  locale?: string
  user?: UserWithProfile | null
  cart?: CartWithItems | null
  messages?: Record<string, string>
  mockSupabaseClient?: any
}

interface TestProvidersProps extends TestProvidersOptions {
  children: React.ReactNode
}

/**
 * Provider principal pour les tests
 */
export function TestProviders({
  children,
  locale = 'fr',
  user = null,
  cart = null,
  messages = mockMessages,
  mockSupabaseClient,
}: TestProvidersProps) {
  const supabaseClient = mockSupabaseClient || createClient()
  
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="UTC"
      now={new Date('2024-01-01T00:00:00.000Z')}
    >
      {children}
    </NextIntlClientProvider>
  )
}

/**
 * Hook pour créer un contexte de test avec providers
 */
export function useTestProviders(options: TestProvidersOptions = {}) {
  const {
    locale = 'fr',
    user = null,
    cart = null,
    messages = mockMessages,
    mockSupabaseClient,
  } = options
  
  return {
    locale,
    user,
    cart,
    messages,
    mockSupabaseClient,
  }
}

/**
 * Factory pour créer des options de test communes
 */
export class TestContextFactory {
  /**
   * Contexte pour utilisateur invité
   */
  static guest() {
    return {
      user: UserFactory.guest(),
      cart: CartFactory.forGuest('guest-123', 1),
    }
  }
  
  /**
   * Contexte pour utilisateur authentifié
   */
  static authenticated(userId: string = 'user-123') {
    return {
      user: UserFactory.authenticated({ user: { id: userId } }),
      cart: CartFactory.forUser(userId, 2),
    }
  }
  
  /**
   * Contexte pour admin
   */
  static admin(userId: string = 'admin-123') {
    return {
      user: UserFactory.admin({ user: { id: userId } }),
      cart: CartFactory.forUser(userId, 1),
    }
  }
  
  /**
   * Contexte avec panier vide
   */
  static withEmptyCart(userId: string = 'user-123') {
    return {
      user: UserFactory.authenticated({ user: { id: userId } }),
      cart: { cart: CartFactory.empty(userId), items: [] },
    }
  }
  
  /**
   * Contexte avec panier plein
   */
  static withFullCart(userId: string = 'user-123') {
    return {
      user: UserFactory.authenticated({ user: { id: userId } }),
      cart: CartFactory.forUser(userId, 5),
    }
  }
  
  /**
   * Contexte avec produits en promotion
   */
  static withDiscountedCart(userId: string = 'user-123') {
    return {
      user: UserFactory.authenticated({ user: { id: userId } }),
      cart: CartFactory.withDiscountedItems(userId),
    }
  }
  
  /**
   * Contexte multilingue
   */
  static multilingual(locale: 'fr' | 'en' | 'de' | 'es' = 'en') {
    const baseMessages = {
      en: {
        'Cart.addToCart': 'Add to cart',
        'Cart.empty': 'Your cart is empty',
        'Products.outOfStock': 'Out of stock',
        'Common.loading': 'Loading...',
      },
      de: {
        'Cart.addToCart': 'In den Warenkorb',
        'Cart.empty': 'Ihr Warenkorb ist leer',
        'Products.outOfStock': 'Nicht vorrätig',
        'Common.loading': 'Laden...',
      },
      es: {
        'Cart.addToCart': 'Añadir al carrito',
        'Cart.empty': 'Tu carrito está vacío',
        'Products.outOfStock': 'Agotado',
        'Common.loading': 'Cargando...',
      },
    }
    
    return {
      locale,
      messages: { ...mockMessages, ...baseMessages[locale] },
      user: UserFactory.authenticated(),
      cart: CartFactory.forUser('user-123', 2),
    }
  }
}