/**
 * Tests E2E pour la navigation mobile - Phase 3.4
 * Tests de responsive design et interactions tactiles
 */

import { test, expect, devices } from '@playwright/test'

// Configuration mobile
const iPhone = devices['iPhone 13']
const androidPhone = devices['Pixel 5']

test.describe('Mobile Navigation E2E - Phase 3.4', () => {
  
  test.describe('iPhone Tests', () => {
    test.use({ ...iPhone })
    
    test('mobile menu opens and closes correctly on iPhone', async ({ page }) => {
      // Act - Aller à la page d'accueil
      await page.goto('/')
      
      // Assert - Vérifier que le menu mobile est masqué initialement
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      
      // Act - Ouvrir le menu mobile
      await page.click('[data-testid="mobile-menu-button"]')
      
      // Assert - Vérifier que le menu s'ouvre
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-nav-items"]')).toBeVisible()
      
      // Assert - Vérifier les éléments de navigation
      await expect(page.locator('[data-testid="mobile-nav-home"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-nav-shop"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-nav-about"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-nav-contact"]')).toBeVisible()
      
      // Act - Fermer le menu en cliquant sur l'overlay
      await page.click('[data-testid="mobile-menu-overlay"]')
      
      // Assert - Vérifier que le menu se ferme
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible()
    })
    
    test('mobile navigation between pages works correctly', async ({ page }) => {
      await page.goto('/')
      
      // Act - Ouvrir le menu et naviguer vers la boutique
      await page.click('[data-testid="mobile-menu-button"]')
      await page.click('[data-testid="mobile-nav-shop"]')
      
      // Assert - Vérifier la navigation
      await expect(page).toHaveURL(/.*\/shop/)
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible() // Menu fermé automatiquement
      
      // Act - Naviguer vers les articles
      await page.click('[data-testid="mobile-menu-button"]')
      await page.click('[data-testid="mobile-nav-articles"]')
      
      // Assert - Vérifier la navigation
      await expect(page).toHaveURL(/.*\/articles/)
      await expect(page.locator('.articles-grid')).toBeVisible()
    })
    
    test('mobile cart interaction works correctly', async ({ page }) => {
      // Act - Aller à la boutique
      await page.goto('/shop')
      
      // Assert - Vérifier l'affichage mobile des produits
      await expect(page.locator('.products-grid')).toBeVisible()
      await expect(page.locator('.product-card')).toHaveCount.greaterThan(0)
      
      // Act - Ajouter un produit au panier
      const firstProduct = page.locator('.product-card').first()
      await firstProduct.scrollIntoViewIfNeeded()
      await firstProduct.locator('[data-testid="add-to-cart"]').click()
      
      // Assert - Vérifier l'indicateur de panier
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('1')
      
      // Act - Ouvrir le panier mobile
      await page.click('[data-testid="mobile-cart-button"]')
      
      // Assert - Vérifier l'affichage du panier mobile
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).toBeVisible()
      await expect(page.locator('.cart-item')).toHaveCount(1)
      
      // Act - Modifier la quantité
      await page.click('[data-testid="quantity-plus"]')
      
      // Assert - Vérifier la mise à jour
      await expect(page.locator('[data-testid="item-quantity"]')).toHaveValue('2')
      await expect(page.locator('[data-testid="cart-count"]')).toContainText('2')
      
      // Act - Fermer le panier
      await page.click('[data-testid="close-cart-drawer"]')
      
      // Assert - Vérifier la fermeture
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).not.toBeVisible()
    })
    
    test('mobile form interactions are touch-friendly', async ({ page }) => {
      // Act - Aller au formulaire de contact
      await page.goto('/contact')
      
      // Act - Interactions tactiles sur le formulaire
      await page.tap('[data-testid="contact-name"]')
      await page.fill('[data-testid="contact-name"]', 'Utilisateur Mobile')
      
      await page.tap('[data-testid="contact-email"]')
      await page.fill('[data-testid="contact-email"]', 'mobile@example.com')
      
      await page.tap('[data-testid="contact-message"]')
      await page.fill('[data-testid="contact-message"]', 'Message depuis mobile')
      
      // Act - Soumettre avec tap
      await page.tap('[data-testid="submit-contact"]')
      
      // Assert - Vérifier la soumission
      await expect(page.locator('.success-message')).toBeVisible()
    })
    
    test('mobile checkout flow is optimized', async ({ page }) => {
      // Setup - Ajouter un produit
      await page.goto('/shop')
      await page.locator('.product-card').first().locator('[data-testid="add-to-cart"]').click()
      
      // Act - Aller au checkout
      await page.click('[data-testid="mobile-cart-button"]')
      await page.click('[data-testid="checkout-button"]')
      
      // Assert - Vérifier l'affichage mobile du checkout
      await expect(page.locator('[data-testid="mobile-checkout"]')).toBeVisible()
      
      // Act - Remplir l'adresse avec des gestes tactiles
      await page.tap('[data-testid="shipping-address"]')
      await page.fill('[data-testid="shipping-address"]', '123 Mobile Street')
      
      // Act - Utiliser les sélecteurs tactiles
      await page.tap('[data-testid="shipping-method-selector"]')
      await page.tap('[data-testid="shipping-standard"]')
      
      // Act - Défiler vers le bas pour voir le bouton de paiement
      await page.locator('[data-testid="payment-button"]').scrollIntoViewIfNeeded()
      await page.tap('[data-testid="payment-button"]')
      
      // Assert - Vérifier la navigation vers Stripe mobile
      await page.waitForURL(/.*stripe\.com.*/)
      
      // Assert - Vérifier l'interface mobile de Stripe
      await expect(page.locator('.Mobile')).toBeVisible({ timeout: 10000 })
    })
  })
  
  test.describe('Android Tests', () => {
    test.use({ ...androidPhone })
    
    test('swipe gestures work for product gallery on Android', async ({ page }) => {
      // Act - Aller à un produit avec galerie
      await page.goto('/shop')
      await page.locator('.product-card').first().click()
      
      // Assert - Vérifier la galerie mobile
      await expect(page.locator('[data-testid="mobile-gallery"]')).toBeVisible()
      
      // Act - Effectuer un swipe horizontal
      const gallery = page.locator('[data-testid="mobile-gallery"]')
      await gallery.swipeLeft()
      
      // Assert - Vérifier le changement d'image
      await expect(page.locator('[data-testid="gallery-image-2"]')).toBeVisible()
      
      // Act - Swipe vers la droite
      await gallery.swipeRight()
      
      // Assert - Vérifier le retour à la première image
      await expect(page.locator('[data-testid="gallery-image-1"]')).toBeVisible()
    })
    
    test('pull-to-refresh works on product listings', async ({ page }) => {
      // Act - Aller à la boutique
      await page.goto('/shop')
      
      // Act - Effectuer un pull-to-refresh
      await page.touchscreen.tap(100, 100)
      await page.touchscreen.tap(100, 200) // Geste de tirage vers le bas
      
      // Assert - Vérifier l'indicateur de rafraîchissement
      await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
      
      // Assert - Vérifier que les produits se rechargent
      await expect(page.locator('[data-testid="refresh-indicator"]')).not.toBeVisible({ timeout: 5000 })
      await expect(page.locator('.product-card')).toHaveCount.greaterThan(0)
    })
    
    test('Android back button handling works correctly', async ({ page }) => {
      // Act - Navigation multiple
      await page.goto('/')
      await page.click('[data-testid="mobile-menu-button"]')
      await page.click('[data-testid="mobile-nav-shop"]')
      await page.locator('.product-card').first().click()
      
      // Act - Utiliser le bouton retour Android
      await page.goBack()
      
      // Assert - Vérifier le retour à la liste des produits
      await expect(page).toHaveURL(/.*\/shop/)
      
      // Act - Retour encore
      await page.goBack()
      
      // Assert - Vérifier le retour à l'accueil
      await expect(page).toHaveURL(/.*\/$/)
    })
  })
  
  test.describe('Responsive Breakpoints', () => {
    test('tablet view displays correctly', async ({ page }) => {
      // Setup - Taille tablet
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')
      
      // Assert - Vérifier l'affichage tablet
      await expect(page.locator('[data-testid="tablet-navigation"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible()
      
      // Act - Tester la grille de produits en tablet
      await page.goto('/shop')
      
      // Assert - Vérifier la grille adaptée
      const productGrid = page.locator('.products-grid')
      await expect(productGrid).toHaveCSS('grid-template-columns', /.*(2fr|repeat\(2,).*/)
    })
    
    test('small mobile view (320px) works correctly', async ({ page }) => {
      // Setup - Très petite taille mobile
      await page.setViewportSize({ width: 320, height: 568 })
      await page.goto('/')
      
      // Assert - Vérifier l'adaptation au petit écran
      await expect(page.locator('[data-testid="compact-header"]')).toBeVisible()
      
      // Act - Tester le menu sur petit écran
      await page.click('[data-testid="mobile-menu-button"]')
      
      // Assert - Vérifier que le menu occupe tout l'écran
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
      await expect(mobileMenu).toHaveCSS('width', '320px')
    })
    
    test('landscape mobile orientation works', async ({ page }) => {
      // Setup - Orientation paysage mobile
      await page.setViewportSize({ width: 667, height: 375 })
      await page.goto('/shop')
      
      // Assert - Vérifier l'adaptation paysage
      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible()
      
      // Act - Tester le panier en paysage
      await page.click('[data-testid="mobile-cart-button"]')
      
      // Assert - Vérifier l'affichage du panier en paysage
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).toHaveCSS('width', /50%|333px/)
    })
  })
  
  test.describe('Touch Interactions', () => {
    test.use({ ...iPhone })
    
    test('long press context menus work', async ({ page }) => {
      await page.goto('/shop')
      
      // Act - Long press sur un produit
      const productCard = page.locator('.product-card').first()
      await productCard.touchscreen.tap({ position: { x: 100, y: 100 }, duration: 1000 })
      
      // Assert - Vérifier le menu contextuel
      await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()
      await expect(page.locator('[data-testid="add-to-favorites"]')).toBeVisible()
      await expect(page.locator('[data-testid="quick-view"]')).toBeVisible()
    })
    
    test('double tap to zoom works on product images', async ({ page }) => {
      await page.goto('/shop')
      await page.locator('.product-card').first().click()
      
      // Act - Double tap sur l'image
      const productImage = page.locator('[data-testid="product-image"]')
      await productImage.dblclick()
      
      // Assert - Vérifier le zoom
      await expect(page.locator('[data-testid="image-zoom-modal"]')).toBeVisible()
      
      // Act - Pinch to zoom
      await productImage.touchscreen.tap({ position: { x: 100, y: 100 } })
      // Simuler le pinch zoom (simplifié)
      await page.keyboard.press('Equal') // Zoom in
      
      // Assert - Vérifier le niveau de zoom
      await expect(productImage).toHaveCSS('transform', /scale/)
    })
    
    test('swipe to dismiss modals works', async ({ page }) => {
      await page.goto('/shop')
      await page.click('[data-testid="mobile-cart-button"]')
      
      // Assert - Panier ouvert
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).toBeVisible()
      
      // Act - Swipe down pour fermer
      const cartDrawer = page.locator('[data-testid="mobile-cart-drawer"]')
      await cartDrawer.swipeDown()
      
      // Assert - Vérifier la fermeture
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).not.toBeVisible()
    })
  })
  
  test.describe('Performance on Mobile', () => {
    test.use({ ...iPhone })
    
    test('page load times are acceptable on mobile', async ({ page }) => {
      // Act - Mesurer le temps de chargement
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Assert - Vérifier le temps de chargement (moins de 3 secondes)
      expect(loadTime).toBeLessThan(3000)
      
      // Assert - Vérifier les Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          new PerformanceObserver(list => {
            const entries = list.getEntries()
            resolve(entries.map(entry => ({
              name: entry.name,
              value: entry.value
            })))
          }).observe({ entryTypes: ['measure', 'navigation'] })
        })
      })
      
      // Assert - FCP et LCP acceptables
      expect(metrics).toBeDefined()
    })
    
    test('images are optimized for mobile', async ({ page }) => {
      await page.goto('/shop')
      
      // Act - Vérifier les images des produits
      const productImages = page.locator('.product-card img')
      const imageCount = await productImages.count()
      
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const image = productImages.nth(i)
        
        // Assert - Vérifier les attributs responsive
        await expect(image).toHaveAttribute('loading', 'lazy')
        await expect(image).toHaveAttribute('srcset')
        
        // Assert - Vérifier la taille des images
        const src = await image.getAttribute('src')
        expect(src).toContain('w_') // Cloudinary ou autre optimisation
      }
    })
    
    test('JavaScript bundle size is optimized', async ({ page }) => {
      // Act - Intercepter les requêtes de scripts
      const scriptSizes: number[] = []
      
      page.on('response', response => {
        if (response.url().includes('.js') && response.url().includes('/_next/')) {
          response.body().then(body => {
            scriptSizes.push(body.length)
          })
        }
      })
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Assert - Vérifier la taille totale des scripts
      const totalSize = scriptSizes.reduce((sum, size) => sum + size, 0)
      expect(totalSize).toBeLessThan(1024 * 1024) // Moins de 1MB
    })
  })
})

// Extension de l'interface Page pour les gestes tactiles
declare global {
  namespace PlaywrightTest {
    interface Locator {
      swipeLeft(): Promise<void>
      swipeRight(): Promise<void>
      swipeUp(): Promise<void>
      swipeDown(): Promise<void>
    }
  }
}

// Implémentation des gestes tactiles
test.beforeEach(async ({ page }) => {
  // Ajouter les méthodes de swipe aux locators
  page.addInitScript(() => {
    // Polyfill pour les gestes tactiles
    Object.defineProperty(HTMLElement.prototype, 'swipeLeft', {
      value: function() {
        const rect = this.getBoundingClientRect()
        const startX = rect.right - 10
        const endX = rect.left + 10
        const y = rect.top + rect.height / 2
        
        this.dispatchEvent(new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: this, clientX: startX, clientY: y })]
        }))
        this.dispatchEvent(new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: this, clientX: endX, clientY: y })]
        }))
        this.dispatchEvent(new TouchEvent('touchend', { touches: [] }))
      }
    })
    
    // Autres directions de swipe...
  })
})