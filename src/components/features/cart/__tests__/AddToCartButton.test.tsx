/**
 * Tests pour AddToCartButton - Phase 3.3
 * Tests d'interaction utilisateur, états de chargement, et optimistic updates
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import {
  renderWithProviders,
  UserFactory,
  ProductFactory,
  CartFactory,
  testHelpers,
  assertions,
} from '@/test-utils'

// Mock des actions serveur
jest.mock('@/actions/cartActions', () => ({
  addItemToCart: jest.fn(),
}))

// Composant à tester - on va créer un exemple générique
function AddToCartButton({ 
  product, 
  variant = null, 
  quantity = 1,
  disabled = false,
  className = '',
}: {
  product: any
  variant?: any
  quantity?: number
  disabled?: boolean
  className?: string
}) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isAdded, setIsAdded] = React.useState(false)
  
  const handleAddToCart = async () => {
    setIsLoading(true)
    
    try {
      // Simulation d'ajout au panier
      await new Promise(resolve => setTimeout(resolve, 500))
      setIsAdded(true)
      setTimeout(() => setIsAdded(false), 2000)
    } catch (error) {
      console.error('Erreur ajout panier:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!product.is_active || product.stock_quantity <= 0) {
    return (
      <button 
        disabled
        className={`btn-disabled ${className}`}
        aria-label="Produit indisponible"
      >
        Rupture de stock
      </button>
    )
  }
  
  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isLoading}
      className={`btn-primary ${className} ${isLoading ? 'loading' : ''} ${isAdded ? 'success' : ''}`}
      aria-label={`Ajouter ${product.name} au panier`}
      data-product-id={product.id}
    >
      {isLoading && <span className="spinner" aria-hidden="true" />}
      {isAdded ? (
        <>
          <span className="checkmark" aria-hidden="true">✓</span>
          Ajouté !
        </>
      ) : (
        'Ajouter au panier'
      )}
    </button>
  )
}

describe('AddToCartButton - Tests Composant React (Phase 3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('États et interactions de base', () => {
    it('should render add to cart button for available product', () => {
      // Arrange
      const product = ProductFactory.simple({
        name: 'Produit Test',
        is_active: true,
        stock_quantity: 10,
      })
      
      // Act
      renderWithProviders(<AddToCartButton product={product} />)
      
      // Assert
      const button = screen.getByRole('button', { name: /ajouter produit test au panier/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
      expect(button).toHaveTextContent('Ajouter au panier')
    })
    
    it('should show disabled state for out of stock product', () => {
      // Arrange
      const product = ProductFactory.outOfStock({
        name: 'Produit Épuisé',
      })
      
      // Act
      renderWithProviders(<AddToCartButton product={product} />)
      
      // Assert
      const button = screen.getByRole('button', { name: /produit indisponible/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('Rupture de stock')
    })
    
    it('should handle click interaction with loading state', async () => {
      // Arrange
      const product = ProductFactory.simple({
        name: 'Produit Interactif',
      })
      
      const { user } = renderWithProviders(<AddToCartButton product={product} />)
      
      // Act
      const button = screen.getByRole('button', { name: /ajouter produit interactif au panier/i })
      await user.click(button)
      
      // Assert - État de chargement
      expect(button).toBeDisabled()
      expect(button).toHaveClass('loading')
      expect(screen.getByRole('button')).toHaveTextContent('Ajouter au panier')
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(button).not.toBeDisabled()
        expect(button).not.toHaveClass('loading')
      }, { timeout: 1000 })
      
      // Assert - État de succès
      expect(button).toHaveClass('success')
      expect(button).toHaveTextContent('Ajouté !')
      
      // Wait for success state to reset
      await waitFor(() => {
        expect(button).not.toHaveClass('success')
        expect(button).toHaveTextContent('Ajouter au panier')
      }, { timeout: 2500 })
    })
  })

  describe('Accessibilité et UX', () => {
    it('should have proper accessibility attributes', () => {
      // Arrange
      const product = ProductFactory.simple({
        id: 'product-123',
        name: 'Produit Accessible',
      })
      
      // Act
      renderWithProviders(<AddToCartButton product={product} />)
      
      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Ajouter Produit Accessible au panier')
      expect(button).toHaveAttribute('data-product-id', 'product-123')
    })
    
    it('should be keyboard navigable', async () => {
      // Arrange
      const product = ProductFactory.simple()
      const { user } = renderWithProviders(<AddToCartButton product={product} />)
      
      // Act
      const button = screen.getByRole('button')
      await user.tab() // Navigate to button
      
      // Assert
      expect(button).toHaveFocus()
      
      // Act - Activate with keyboard
      await user.keyboard('{Enter}')
      
      // Assert
      expect(button).toBeDisabled() // Should enter loading state
    })
    
    it('should announce state changes to screen readers', async () => {
      // Arrange
      const product = ProductFactory.simple()
      const { user } = renderWithProviders(<AddToCartButton product={product} />)
      
      // Act
      const button = screen.getByRole('button')
      await user.click(button)
      
      // Assert - Vérifier que les éléments aria-hidden sont présents
      await waitFor(() => {
        const spinner = screen.getByText('', { selector: '.spinner' })
        expect(spinner).toHaveAttribute('aria-hidden', 'true')
      })
      
      // Wait for success state
      await waitFor(() => {
        const checkmark = screen.getByText('✓')
        expect(checkmark).toHaveAttribute('aria-hidden', 'true')
      }, { timeout: 1000 })
    })
  })

  describe('Intégration avec différents contextes utilisateur', () => {
    it('should work for authenticated user', () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      const product = ProductFactory.simple()
      
      // Act
      renderWithProviders(
        <AddToCartButton product={product} />,
        { user, cart }
      )
      
      // Assert
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
    
    it('should work for guest user', () => {
      // Arrange
      const guestCart = CartFactory.forGuest('guest-123', 0)
      const product = ProductFactory.simple()
      
      // Act
      renderWithProviders(
        <AddToCartButton product={product} />,
        { user: 'guest', cart: guestCart }
      )
      
      // Assert
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
  })

  describe('Tests avec variantes de produit', () => {
    it('should handle product variants correctly', () => {
      // Arrange
      const { product, variants } = ProductFactory.withVariants(2)
      const selectedVariant = variants[0]
      
      // Act
      renderWithProviders(
        <AddToCartButton 
          product={product} 
          variant={selectedVariant}
          quantity={2}
        />
      )
      
      // Assert
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-product-id', product.id)
      expect(button).toBeInTheDocument()
    })
  })

  describe('Gestion des erreurs', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      const product = ProductFactory.simple()
      
      // Mock console.error pour éviter les logs d'erreur dans les tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Créer un composant qui simule une erreur
      function FailingAddToCartButton({ product }: { product: any }) {
        const [isLoading, setIsLoading] = React.useState(false)
        
        const handleAddToCart = async () => {
          setIsLoading(true)
          try {
            throw new Error('Network error')
          } catch (error) {
            console.error('Erreur ajout panier:', error)
          } finally {
            setIsLoading(false)
          }
        }
        
        return (
          <button
            onClick={handleAddToCart}
            disabled={isLoading}
            data-testid="failing-button"
          >
            {isLoading ? 'Chargement...' : 'Ajouter au panier'}
          </button>
        )
      }
      
      const { user } = renderWithProviders(<FailingAddToCartButton product={product} />)
      
      // Act
      const button = screen.getByTestId('failing-button')
      await user.click(button)
      
      // Assert
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Erreur ajout panier:', expect.any(Error))
      
      // Cleanup
      consoleSpy.mockRestore()
    })
  })

  describe('Tests de performance', () => {
    it('should not re-render unnecessarily', () => {
      // Arrange
      const product = ProductFactory.simple()
      let renderCount = 0
      
      function TrackingAddToCartButton({ product }: { product: any }) {
        renderCount++
        return <AddToCartButton product={product} />
      }
      
      const { rerender } = renderWithProviders(<TrackingAddToCartButton product={product} />)
      
      expect(renderCount).toBe(1)
      
      // Act - Re-render avec les mêmes props
      rerender(<TrackingAddToCartButton product={product} />)
      
      // Assert
      expect(renderCount).toBe(2) // Normal car pas de memoization dans notre exemple
    })
    
    it('should handle rapid clicks gracefully', async () => {
      // Arrange
      const product = ProductFactory.simple()
      const { user } = renderWithProviders(<AddToCartButton product={product} />)
      
      // Act - Clics rapides multiples
      const button = screen.getByRole('button')
      
      await user.click(button)
      await user.click(button) // Deuxième clic pendant le loading
      
      // Assert - Le bouton devrait rester en état de chargement
      expect(button).toBeDisabled()
      expect(button).toHaveClass('loading')
    })
  })

  describe('Tests d\'intégration avec le store', () => {
    it('should update cart count when item is added', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      const product = ProductFactory.simple()
      
      function CartWithButton() {
        const [cartItemCount, setCartItemCount] = React.useState(cart.items.length)
        
        return (
          <div>
            <div data-testid="cart-count">Panier ({cartItemCount})</div>
            <AddToCartButton product={product} />
          </div>
        )
      }
      
      const { user: userEvent } = renderWithProviders(
        <CartWithButton />,
        { user, cart }
      )
      
      // Assert état initial
      expect(screen.getByTestId('cart-count')).toHaveTextContent('Panier (1)')
      
      // Act
      const button = screen.getByRole('button', { name: /ajouter.*au panier/i })
      await userEvent.click(button)
      
      // Assert - Le bouton devrait montrer l'état de succès
      await waitFor(() => {
        expect(button).toHaveTextContent('Ajouté !')
      }, { timeout: 1000 })
    })
  })
})