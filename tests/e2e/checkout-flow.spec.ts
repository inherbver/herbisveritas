/**
 * Tests E2E pour le parcours de checkout complet - Phase 3.4
 * Tests du parcours critique d'achat de bout en bout
 */

import { test, expect } from '@playwright/test'

test.describe('Checkout Flow E2E - Phase 3.4', () => {
  test.beforeEach(async ({ page }) => {
    // Configuration pour chaque test
    await page.goto('/')
  })

  test('guest user can complete full checkout process', async ({ page }) => {
    // Act - Navigation vers la boutique
    await page.click('text=Boutique')
    await expect(page).toHaveURL(/.*\/shop/)
    
    // Act - Ajouter un produit au panier
    const firstProductCard = page.locator('.product-card').first()
    await expect(firstProductCard).toBeVisible()
    
    const addToCartButton = firstProductCard.locator('button:has-text("Ajouter au panier")')
    await addToCartButton.click()
    
    // Assert - Vérifier que le produit a été ajouté
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1')
    
    // Act - Accéder au panier
    await page.click('[data-testid="cart-button"]')
    await expect(page).toHaveURL(/.*\/cart/)
    
    // Assert - Vérifier le contenu du panier
    await expect(page.locator('.cart-item')).toHaveCount(1)
    await expect(page.locator('.cart-total')).toBeVisible()
    
    // Act - Procéder au checkout
    await page.click('text=Procéder au paiement')
    await expect(page).toHaveURL(/.*\/checkout/)
    
    // Act - Remplir l'adresse de livraison
    await page.fill('[data-testid="shipping-address-line1"]', '123 rue de la Paix')
    await page.fill('[data-testid="shipping-postal-code"]', '75001')
    await page.fill('[data-testid="shipping-city"]', 'Paris')
    
    // Act - Remplir l'adresse de facturation (même que livraison)
    await page.check('[data-testid="billing-same-as-shipping"]')
    
    // Act - Sélectionner mode de livraison
    await page.click('[data-testid="shipping-method-standard"]')
    
    // Act - Remplir les informations de contact
    await page.fill('[data-testid="contact-email"]', 'guest@example.com')
    await page.fill('[data-testid="contact-phone"]', '0123456789')
    
    // Act - Continuer vers le paiement
    await page.click('text=Continuer vers le paiement')
    
    // Assert - Vérifier la page de récapitulatif
    await expect(page.locator('.order-summary')).toBeVisible()
    await expect(page.locator('.shipping-address-summary')).toContainText('123 rue de la Paix')
    await expect(page.locator('.shipping-address-summary')).toContainText('75001 Paris')
    
    // Act - Finaliser la commande (redirection vers Stripe)
    await page.click('text=Finaliser la commande')
    
    // Assert - Vérifier la redirection vers Stripe
    await page.waitForURL(/.*stripe\.com.*/)
    await expect(page.locator('text=Test payment')).toBeVisible({ timeout: 10000 })
  })

  test('authenticated user can complete checkout with saved address', async ({ page }) => {
    // Setup - Se connecter d'abord
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('text=Se connecter')
    
    // Assert - Vérification de la connexion
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Act - Ajouter un produit au panier
    await page.goto('/shop')
    const productCard = page.locator('.product-card').first()
    await productCard.locator('button:has-text("Ajouter au panier")').click()
    
    // Act - Accéder au checkout
    await page.click('[data-testid="cart-button"]')
    await page.click('text=Procéder au paiement')
    
    // Assert - Vérifier que l'adresse sauvegardée est pré-remplie
    await expect(page.locator('[data-testid="saved-address-option"]')).toBeVisible()
    
    // Act - Utiliser l'adresse sauvegardée
    await page.click('[data-testid="use-saved-address"]')
    
    // Act - Sélectionner mode de livraison
    await page.click('[data-testid="shipping-method-express"]')
    
    // Act - Finaliser la commande
    await page.click('text=Continuer vers le paiement')
    await page.click('text=Finaliser la commande')
    
    // Assert - Vérifier la redirection vers Stripe
    await page.waitForURL(/.*stripe\.com.*/)
  })

  test('should handle inventory validation during checkout', async ({ page }) => {
    // Setup - Ajouter un produit avec stock limité
    await page.goto('/shop')
    
    // Act - Trouver un produit avec stock limité
    const limitedStockProduct = page.locator('.product-card:has(.stock-warning)')
    await expect(limitedStockProduct).toBeVisible()
    
    // Act - Ajouter le produit au panier
    await limitedStockProduct.locator('button:has-text("Ajouter au panier")').click()
    
    // Act - Modifier la quantité pour dépasser le stock
    await page.click('[data-testid="cart-button"]')
    const quantityInput = page.locator('[data-testid="quantity-input"]')
    await quantityInput.fill('999') // Quantité impossible
    
    // Act - Procéder au checkout
    await page.click('text=Procéder au paiement')
    
    // Assert - Vérifier l'erreur de stock
    await expect(page.locator('.error-message')).toContainText('stock insuffisant')
    
    // Act - Corriger la quantité
    await page.goto('/cart')
    await quantityInput.fill('1')
    
    // Act - Retry checkout
    await page.click('text=Procéder au paiement')
    
    // Assert - Le checkout devrait maintenant fonctionner
    await expect(page).toHaveURL(/.*\/checkout/)
  })

  test('should handle payment failures gracefully', async ({ page }) => {
    // Act - Ajouter un produit et aller au checkout
    await page.goto('/shop')
    await page.locator('.product-card').first().locator('button:has-text("Ajouter au panier")').click()
    await page.click('[data-testid="cart-button"]')
    await page.click('text=Procéder au paiement')
    
    // Act - Remplir les informations rapidement
    await page.fill('[data-testid="shipping-address-line1"]', '123 Test Street')
    await page.fill('[data-testid="shipping-postal-code"]', '75001')
    await page.fill('[data-testid="shipping-city"]', 'Paris')
    await page.fill('[data-testid="contact-email"]', 'test@example.com')
    await page.click('[data-testid="shipping-method-standard"]')
    
    // Act - Continuer vers le paiement
    await page.click('text=Continuer vers le paiement')
    await page.click('text=Finaliser la commande')
    
    // Act - Simuler un échec de paiement en fermant Stripe
    await page.waitForURL(/.*stripe\.com.*/)
    await page.goBack() // Retour sans payer
    
    // Assert - Vérifier la gestion de l'échec
    await expect(page).toHaveURL(/.*\/checkout.*/)
    await expect(page.locator('.payment-error')).toBeVisible()
    await expect(page.locator('.payment-error')).toContainText('paiement')
  })

  test('should validate address with Colissimo API', async ({ page }) => {
    // Act - Aller au checkout
    await page.goto('/shop')
    await page.locator('.product-card').first().locator('button:has-text("Ajouter au panier")').click()
    await page.click('[data-testid="cart-button"]')
    await page.click('text=Procéder au paiement')
    
    // Act - Remplir une adresse française
    await page.fill('[data-testid="shipping-address-line1"]', '1 rue de la paix')
    await page.fill('[data-testid="shipping-postal-code"]', '75001')
    await page.fill('[data-testid="shipping-city"]', 'paris')
    
    // Act - Déclencher la validation Colissimo
    await page.click('[data-testid="validate-address-colissimo"]')
    
    // Assert - Vérifier l'état de validation
    await expect(page.locator('[data-testid="address-validation-loading"]')).toBeVisible()
    
    // Assert - Vérifier que l'adresse a été normalisée
    await expect(page.locator('[data-testid="address-validation-loading"]')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="shipping-address-line1"]')).toHaveValue('1 Rue de la Paix')
    await expect(page.locator('[data-testid="shipping-city"]')).toHaveValue('Paris')
  })

  test('should handle multiple items checkout with different shipping methods', async ({ page }) => {
    // Act - Ajouter plusieurs produits
    await page.goto('/shop')
    
    const productCards = page.locator('.product-card')
    await productCards.nth(0).locator('button:has-text("Ajouter au panier")').click()
    await page.waitForTimeout(500) // Attendre l'ajout
    
    await productCards.nth(1).locator('button:has-text("Ajouter au panier")').click()
    await page.waitForTimeout(500)
    
    await productCards.nth(2).locator('button:has-text("Ajouter au panier")').click()
    
    // Assert - Vérifier que le panier contient 3 articles
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('3')
    
    // Act - Aller au checkout
    await page.click('[data-testid="cart-button"]')
    await expect(page.locator('.cart-item')).toHaveCount(3)
    
    // Act - Modifier les quantités
    await page.locator('.cart-item').nth(1).locator('[data-testid="quantity-input"]').fill('2')
    await page.locator('.cart-item').nth(2).locator('[data-testid="remove-item"]').click()
    
    // Assert - Vérifier les modifications
    await expect(page.locator('.cart-item')).toHaveCount(2)
    
    // Act - Procéder au checkout
    await page.click('text=Procéder au paiement')
    
    // Act - Remplir les informations et tester livraison express
    await page.fill('[data-testid="shipping-address-line1"]', '456 Avenue Test')
    await page.fill('[data-testid="shipping-postal-code"]', '69001')
    await page.fill('[data-testid="shipping-city"]', 'Lyon')
    await page.fill('[data-testid="contact-email"]', 'multi@example.com')
    
    // Act - Sélectionner livraison express
    await page.click('[data-testid="shipping-method-express"]')
    
    // Assert - Vérifier que les frais de port ont changé
    const shippingCost = page.locator('[data-testid="shipping-cost"]')
    await expect(shippingCost).not.toContainText('Gratuite')
    
    // Act - Finaliser
    await page.click('text=Continuer vers le paiement')
    
    // Assert - Vérifier le récapitulatif multi-items
    await expect(page.locator('.order-item')).toHaveCount(2)
    await expect(page.locator('.order-total')).toBeVisible()
  })
})

test.describe('Checkout Error Handling E2E', () => {
  test('should handle network errors during checkout', async ({ page }) => {
    // Setup - Bloquer les requêtes réseau
    await page.route('**/api/checkout', route => route.abort())
    
    // Act - Essayer de procéder au checkout
    await page.goto('/shop')
    await page.locator('.product-card').first().locator('button:has-text("Ajouter au panier")').click()
    await page.click('[data-testid="cart-button"]')
    await page.click('text=Procéder au paiement')
    
    // Act - Remplir et soumettre
    await page.fill('[data-testid="shipping-address-line1"]', '123 Network Error St')
    await page.fill('[data-testid="shipping-postal-code"]', '75001')
    await page.fill('[data-testid="shipping-city"]', 'Paris')
    await page.fill('[data-testid="contact-email"]', 'error@example.com')
    await page.click('[data-testid="shipping-method-standard"]')
    
    await page.click('text=Continuer vers le paiement')
    
    // Assert - Vérifier la gestion de l'erreur réseau
    await expect(page.locator('.network-error')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.retry-button')).toBeVisible()
    
    // Act - Retry après restauration du réseau
    await page.unroute('**/api/checkout')
    await page.click('.retry-button')
    
    // Assert - Le checkout devrait maintenant fonctionner
    await expect(page.locator('.order-summary')).toBeVisible({ timeout: 10000 })
  })

  test('should validate form fields before submission', async ({ page }) => {
    // Act - Aller au checkout sans remplir les champs
    await page.goto('/shop')
    await page.locator('.product-card').first().locator('button:has-text("Ajouter au panier")').click()
    await page.click('[data-testid="cart-button"]')
    await page.click('text=Procéder au paiement')
    
    // Act - Essayer de continuer sans remplir
    await page.click('text=Continuer vers le paiement')
    
    // Assert - Vérifier les erreurs de validation
    await expect(page.locator('[data-testid="address-error"]')).toContainText('requis')
    await expect(page.locator('[data-testid="email-error"]')).toContainText('requis')
    
    // Act - Remplir partiellement avec des données invalides
    await page.fill('[data-testid="shipping-address-line1"]', '123')  // Trop court
    await page.fill('[data-testid="contact-email"]', 'invalid-email') // Email invalide
    await page.fill('[data-testid="shipping-postal-code"]', '123') // Code postal invalide
    
    await page.click('text=Continuer vers le paiement')
    
    // Assert - Vérifier les validations spécifiques
    await expect(page.locator('[data-testid="address-error"]')).toContainText('5 caractères')
    await expect(page.locator('[data-testid="email-error"]')).toContainText('email valide')
    await expect(page.locator('[data-testid="postal-code-error"]')).toContainText('5 chiffres')
  })
})