/**
 * Tests E2E pour l'interface d'administration - Phase 3.4
 * Tests des fonctionnalités admin critiques
 */

import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard E2E - Phase 3.4', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - Se connecter en tant qu'admin
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'admin@herbisveritas.com')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('text=Se connecter')
    
    // Assert - Vérifier la connexion admin
    await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible()
    
    // Act - Accéder au dashboard admin
    await page.goto('/admin')
  })

  test('admin can view dashboard with key metrics', async ({ page }) => {
    // Assert - Vérifier les métriques principales
    await expect(page.locator('[data-testid="total-products"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-orders"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-users"]')).toBeVisible()
    
    // Assert - Vérifier les graphiques
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="orders-chart"]')).toBeVisible()
    
    // Assert - Vérifier les tableaux récents
    await expect(page.locator('[data-testid="recent-orders"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-products"]')).toBeVisible()
    
    // Act - Filtrer par période
    await page.selectOption('[data-testid="period-filter"]', '7d')
    
    // Assert - Vérifier que les données se mettent à jour
    await expect(page.locator('[data-testid="loading-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="loading-metrics"]')).not.toBeVisible({ timeout: 5000 })
    
    // Assert - Nouvelles données chargées
    await expect(page.locator('[data-testid="total-revenue"]')).not.toBeEmpty()
  })

  test('admin can manage products (CRUD operations)', async ({ page }) => {
    // Act - Naviguer vers la gestion des produits
    await page.click('[data-testid="nav-products"]')
    await expect(page).toHaveURL(/.*\/admin\/products/)
    
    // Assert - Vérifier la liste des produits
    await expect(page.locator('[data-testid="products-table"]')).toBeVisible()
    await expect(page.locator('.product-row')).toHaveCount.greaterThan(0)
    
    // Test CREATE - Ajouter un nouveau produit
    await page.click('[data-testid="add-product-btn"]')
    await expect(page).toHaveURL(/.*\/admin\/products\/new/)
    
    // Act - Remplir le formulaire de produit
    await page.fill('[data-testid="product-name"]', 'Produit Test E2E')
    await page.fill('[data-testid="product-description"]', 'Description du produit de test')
    await page.fill('[data-testid="product-price"]', '29.99')
    await page.selectOption('[data-testid="product-category"]', 'légumes')
    await page.fill('[data-testid="product-stock"]', '100')
    
    // Act - Upload d'image
    await page.setInputFiles('[data-testid="product-image"]', {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    })
    
    // Act - Sauvegarder
    await page.click('[data-testid="save-product"]')
    
    // Assert - Vérifier la création
    await expect(page).toHaveURL(/.*\/admin\/products/)
    await expect(page.locator('.success-message')).toContainText('créé avec succès')
    
    // Test READ - Rechercher le produit créé
    await page.fill('[data-testid="search-products"]', 'Produit Test E2E')
    await expect(page.locator('.product-row:has-text("Produit Test E2E")')).toBeVisible()
    
    // Test UPDATE - Modifier le produit
    const productRow = page.locator('.product-row:has-text("Produit Test E2E")')
    await productRow.locator('[data-testid="edit-product"]').click()
    
    await page.fill('[data-testid="product-price"]', '34.99')
    await page.click('[data-testid="save-product"]')
    
    // Assert - Vérifier la modification
    await expect(page.locator('.success-message')).toContainText('modifié avec succès')
    await expect(page.locator('.product-row:has-text("34,99")')).toBeVisible()
    
    // Test DELETE - Supprimer le produit
    await productRow.locator('[data-testid="delete-product"]').click()
    
    // Assert - Confirmer la suppression
    await page.click('[data-testid="confirm-delete"]')
    
    // Assert - Vérifier la suppression
    await expect(page.locator('.success-message')).toContainText('supprimé avec succès')
    await expect(page.locator('.product-row:has-text("Produit Test E2E")')).not.toBeVisible()
  })

  test('admin can manage orders and update statuses', async ({ page }) => {
    // Act - Naviguer vers la gestion des commandes
    await page.click('[data-testid="nav-orders"]')
    await expect(page).toHaveURL(/.*\/admin\/orders/)
    
    // Assert - Vérifier la liste des commandes
    await expect(page.locator('[data-testid="orders-table"]')).toBeVisible()
    
    // Act - Filtrer par statut
    await page.selectOption('[data-testid="status-filter"]', 'pending')
    await expect(page.locator('.order-row')).toHaveCount.greaterThan(0)
    
    // Act - Voir le détail d'une commande
    const firstOrder = page.locator('.order-row').first()
    await firstOrder.click()
    
    // Assert - Vérifier le détail de la commande
    await expect(page.locator('[data-testid="order-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="order-items"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="shipping-info"]')).toBeVisible()
    
    // Act - Changer le statut de la commande
    await page.selectOption('[data-testid="order-status"]', 'processing')
    await page.click('[data-testid="update-status"]')
    
    // Assert - Vérifier la mise à jour
    await expect(page.locator('.success-message')).toContainText('Statut mis à jour')
    await expect(page.locator('[data-testid="order-status"]')).toHaveValue('processing')
    
    // Act - Ajouter une note de suivi
    await page.fill('[data-testid="tracking-note"]', 'Commande en préparation')
    await page.click('[data-testid="add-note"]')
    
    // Assert - Vérifier l'ajout de la note
    await expect(page.locator('.tracking-notes')).toContainText('Commande en préparation')
    
    // Act - Générer une étiquette d'expédition
    await page.click('[data-testid="generate-label"]')
    
    // Assert - Vérifier la génération
    await expect(page.locator('[data-testid="shipping-label"]')).toBeVisible()
    
    // Act - Marquer comme expédiée
    await page.selectOption('[data-testid="order-status"]', 'shipped')
    await page.fill('[data-testid="tracking-number"]', 'TRACK123456789')
    await page.click('[data-testid="update-status"]')
    
    // Assert - Vérifier l'expédition
    await expect(page.locator('[data-testid="tracking-number-display"]')).toContainText('TRACK123456789')
  })

  test('admin can view and manage users', async ({ page }) => {
    // Act - Naviguer vers la gestion des utilisateurs
    await page.click('[data-testid="nav-users"]')
    await expect(page).toHaveURL(/.*\/admin\/users/)
    
    // Assert - Vérifier la liste des utilisateurs
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible()
    
    // Act - Rechercher un utilisateur
    await page.fill('[data-testid="search-users"]', 'test@example.com')
    await expect(page.locator('.user-row:has-text("test@example.com")')).toBeVisible()
    
    // Act - Voir le profil d'un utilisateur
    const userRow = page.locator('.user-row:has-text("test@example.com")')
    await userRow.click()
    
    // Assert - Vérifier les détails utilisateur
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-orders"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-addresses"]')).toBeVisible()
    
    // Act - Modifier les permissions
    await page.click('[data-testid="edit-permissions"]')
    await page.check('[data-testid="permission-content-create"]')
    await page.click('[data-testid="save-permissions"]')
    
    // Assert - Vérifier la mise à jour
    await expect(page.locator('.success-message')).toContainText('Permissions mises à jour')
    
    // Act - Voir l'historique d'activité
    await page.click('[data-testid="activity-tab"]')
    await expect(page.locator('[data-testid="activity-log"]')).toBeVisible()
    await expect(page.locator('.activity-item')).toHaveCount.greaterThan(0)
  })

  test('admin can manage content (articles, markets, partners)', async ({ page }) => {
    // Test gestion des articles
    await page.click('[data-testid="nav-content"]')
    await page.click('[data-testid="nav-articles"]')
    
    // Act - Créer un nouvel article
    await page.click('[data-testid="add-article"]')
    await page.fill('[data-testid="article-title"]', 'Article Test E2E')
    await page.fill('[data-testid="article-content"]', 'Contenu de l\'article de test')
    await page.selectOption('[data-testid="article-category"]', 'conseils')
    await page.click('[data-testid="publish-article"]')
    
    // Assert - Vérifier la publication
    await expect(page.locator('.success-message')).toContainText('Article publié')
    
    // Test gestion des marchés
    await page.click('[data-testid="nav-markets"]')
    
    // Act - Ajouter un nouveau marché
    await page.click('[data-testid="add-market"]')
    await page.fill('[data-testid="market-name"]', 'Marché Test E2E')
    await page.fill('[data-testid="market-city"]', 'Lyon')
    await page.fill('[data-testid="market-address"]', 'Place Bellecour')
    await page.fill('[data-testid="market-date"]', '2024-12-25')
    await page.fill('[data-testid="market-hours"]', '08:00-18:00')
    await page.click('[data-testid="save-market"]')
    
    // Assert - Vérifier l'ajout
    await expect(page.locator('.success-message')).toContainText('Marché ajouté')
    
    // Test gestion des partenaires
    await page.click('[data-testid="nav-partners"]')
    
    // Act - Ajouter un partenaire
    await page.click('[data-testid="add-partner"]')
    await page.fill('[data-testid="partner-name"]', 'Partenaire Test E2E')
    await page.fill('[data-testid="partner-description"]', 'Description du partenaire')
    await page.fill('[data-testid="partner-website"]', 'https://partenaire-test.com')
    await page.click('[data-testid="save-partner"]')
    
    // Assert - Vérifier l'ajout
    await expect(page.locator('.success-message')).toContainText('Partenaire ajouté')
  })

  test('admin can access performance analytics', async ({ page }) => {
    // Act - Naviguer vers les analytics
    await page.click('[data-testid="nav-analytics"]')
    await expect(page).toHaveURL(/.*\/admin\/analytics/)
    
    // Assert - Vérifier les métriques de performance
    await expect(page.locator('[data-testid="page-load-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="conversion-metrics"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-metrics"]')).toBeVisible()
    
    // Act - Changer la période d'analyse
    await page.selectOption('[data-testid="analytics-period"]', '30d')
    
    // Assert - Vérifier le rechargement des données
    await expect(page.locator('[data-testid="loading-analytics"]')).toBeVisible()
    await expect(page.locator('[data-testid="loading-analytics"]')).not.toBeVisible({ timeout: 10000 })
    
    // Act - Exporter les données
    await page.click('[data-testid="export-analytics"]')
    
    // Assert - Vérifier le téléchargement
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-csv"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('analytics')
  })
})

test.describe('Admin Security and Permissions E2E', () => {
  test('non-admin user cannot access admin dashboard', async ({ page }) => {
    // Setup - Se connecter en tant qu'utilisateur normal
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('text=Se connecter')
    
    // Act - Essayer d'accéder à l'admin
    await page.goto('/admin')
    
    // Assert - Vérifier la redirection
    await expect(page).toHaveURL(/.*\/403/)
    await expect(page.locator('.error-message')).toContainText('accès refusé')
  })

  test('admin session expires and redirects to login', async ({ page }) => {
    // Setup - Se connecter en admin
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'admin@herbisveritas.com')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('text=Se connecter')
    
    await page.goto('/admin')
    
    // Act - Simuler l'expiration de session
    await page.evaluate(() => {
      // Supprimer les cookies de session
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    })
    
    // Act - Essayer d'accéder à une page admin
    await page.reload()
    
    // Assert - Vérifier la redirection vers login
    await expect(page).toHaveURL(/.*\/auth\/signin/)
    await expect(page.locator('.session-expired')).toContainText('session expirée')
  })

  test('admin actions are logged for audit trail', async ({ page }) => {
    // Setup
    await page.goto('/auth/signin')
    await page.fill('[data-testid="email"]', 'admin@herbisveritas.com')
    await page.fill('[data-testid="password"]', 'admin123')
    await page.click('text=Se connecter')
    
    await page.goto('/admin')
    
    // Act - Effectuer des actions admin
    await page.click('[data-testid="nav-products"]')
    await page.click('[data-testid="add-product-btn"]')
    await page.fill('[data-testid="product-name"]', 'Produit Audit')
    await page.click('[data-testid="save-product"]')
    
    // Act - Vérifier les logs d'audit
    await page.click('[data-testid="nav-audit"]')
    await expect(page).toHaveURL(/.*\/admin\/audit/)
    
    // Assert - Vérifier que l'action est loggée
    await expect(page.locator('.audit-log')).toContainText('product_created')
    await expect(page.locator('.audit-log')).toContainText('Produit Audit')
    await expect(page.locator('.audit-log')).toContainText('admin@herbisveritas.com')
  })
})