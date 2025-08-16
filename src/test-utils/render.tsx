/**
 * Utilitaires de rendu pour les tests React Testing Library
 * Version améliorée avec support complet des providers et mocking
 */

import React from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders, type TestContextFactory } from './TestProviders'
import { UserFactory, type UserWithProfile } from './factories/UserFactory'
import { CartFactory, type CartWithItems } from './factories/CartFactory'
import { createMockSupabaseClient } from './supabaseMocks'

interface RenderWithProvidersOptions extends RenderOptions {
  // Contexte utilisateur
  user?: UserWithProfile | null | 'guest' | 'authenticated' | 'admin'
  
  // Contexte panier
  cart?: CartWithItems | null | 'empty' | 'withItems' | 'withDiscounts'
  
  // Configuration i18n
  locale?: 'fr' | 'en' | 'de' | 'es'
  messages?: Record<string, string>
  
  // Configuration Supabase
  mockSupabaseClient?: any
  
  // Configuration user-event
  userEventOptions?: Parameters<typeof userEvent.setup>[0]
}

interface RenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>
  rerender: (ui: React.ReactElement, options?: RenderWithProvidersOptions) => void
}

/**
 * Fonction de rendu principale avec tous les providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult {
  const {
    user: userOption = null,
    cart: cartOption = null,
    locale = 'fr',
    messages,
    mockSupabaseClient,
    userEventOptions = {},
    ...renderOptions
  } = options
  
  // Résolution des shortcuts pour user
  let resolvedUser: UserWithProfile | null = null
  if (userOption === 'guest') {
    resolvedUser = null
  } else if (userOption === 'authenticated') {
    resolvedUser = UserFactory.authenticated()
  } else if (userOption === 'admin') {
    resolvedUser = UserFactory.admin()
  } else if (userOption && typeof userOption === 'object') {
    resolvedUser = userOption
  }
  
  // Résolution des shortcuts pour cart
  let resolvedCart: CartWithItems | null = null
  if (cartOption === 'empty') {
    const userId = resolvedUser?.user.id || 'user-123'
    resolvedCart = { cart: CartFactory.empty(userId), items: [] }
  } else if (cartOption === 'withItems') {
    const userId = resolvedUser?.user.id || 'user-123'
    resolvedCart = CartFactory.forUser(userId, 3)
  } else if (cartOption === 'withDiscounts') {
    const userId = resolvedUser?.user.id || 'user-123'
    resolvedCart = CartFactory.withDiscountedItems(userId)
  } else if (cartOption && typeof cartOption === 'object') {
    resolvedCart = cartOption
  }
  
  // Configuration du mock Supabase si nécessaire
  const supabaseClient = mockSupabaseClient || createMockSupabaseClient({
    user: resolvedUser,
    cart: resolvedCart,
  })
  
  // Wrapper avec tous les providers
  function Wrapper({ children }: { children?: React.ReactNode }) {
    return (
      <TestProviders
        locale={locale}
        user={resolvedUser}
        cart={resolvedCart}
        messages={messages}
        mockSupabaseClient={supabaseClient}
      >
        {children}
      </TestProviders>
    )
  }
  
  // Setup user-event
  const userEventInstance = userEvent.setup(userEventOptions)
  
  // Rendu avec wrapper personnalisé
  const renderResult = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  })
  
  // Fonction rerender personnalisée
  const customRerender = (
    rerenderUi: React.ReactElement,
    rerenderOptions: RenderWithProvidersOptions = {}
  ) => {
    const mergedOptions = { ...options, ...rerenderOptions }
    return renderWithProviders(rerenderUi, mergedOptions)
  }
  
  return {
    ...renderResult,
    user: userEventInstance,
    rerender: customRerender,
  }
}

/**
 * Rendu pour composants serveur (sans interaction utilisateur)
 */
export function renderServerComponent(
  ui: React.ReactElement,
  options: Omit<RenderWithProvidersOptions, 'userEventOptions'> = {}
) {
  const { userEventOptions, ...restOptions } = options as RenderWithProvidersOptions
  return renderWithProviders(ui, restOptions)
}

/**
 * Utilitaires pour tests d'intégration
 */
export function setupIntegrationTest(options: RenderWithProvidersOptions = {}) {
  // Reset des factories avant chaque test
  UserFactory.resetCounter()
  CartFactory.resetCounters()
  
  // Configuration par défaut pour tests d'intégration
  const defaultOptions: RenderWithProvidersOptions = {
    user: 'authenticated',
    cart: 'withItems',
    locale: 'fr',
    ...options,
  }
  
  return {
    render: (ui: React.ReactElement, extraOptions: RenderWithProvidersOptions = {}) =>
      renderWithProviders(ui, { ...defaultOptions, ...extraOptions }),
    
    createUser: UserFactory.authenticated,
    createAdminUser: UserFactory.admin,
    createCart: CartFactory.forUser,
    
    mockSupabase: createMockSupabaseClient,
  }
}

/**
 * Helpers pour assertions communes
 */
export const testHelpers = {
  /**
   * Attend qu'un élément soit visible et clique dessus
   */
  async clickWhenVisible(
    userEvent: ReturnType<typeof userEvent.setup>,
    element: HTMLElement
  ) {
    await userEvent.click(element)
  },
  
  /**
   * Saisit du texte dans un champ après l'avoir vidé
   */
  async clearAndType(
    userEvent: ReturnType<typeof userEvent.setup>,
    element: HTMLElement,
    text: string
  ) {
    await userEvent.clear(element)
    await userEvent.type(element, text)
  },
  
  /**
   * Soumet un formulaire
   */
  async submitForm(
    userEvent: ReturnType<typeof userEvent.setup>,
    form: HTMLElement
  ) {
    const submitButton = form.querySelector('button[type="submit"]') as HTMLElement
    if (submitButton) {
      await userEvent.click(submitButton)
    }
  },
}

// Re-export des utilitaires Testing Library
export * from '@testing-library/react'
export { userEvent }

// Export par défaut
export default renderWithProviders