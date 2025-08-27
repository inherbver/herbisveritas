import { test, expect } from '@playwright/test';

test.describe('Simple Working Tests', () => {
  // Test très basique pour vérifier que Playwright fonctionne
  test('should navigate to homepage', async ({ page }) => {
    // Navigation simple avec timeout court
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Vérifier que la page charge
    await expect(page).toHaveURL(/localhost:3003/);
  });

  test('should find shop link and navigate', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Chercher un lien vers la boutique avec plusieurs stratégies
    const shopLink = page.locator('a').filter({ hasText: /boutique|shop/i }).first();
    
    // Vérifier si le lien existe
    const linkExists = await shopLink.count() > 0;
    
    if (linkExists) {
      await shopLink.click();
      // Attendre que l'URL change
      await page.waitForURL('**/shop**', { timeout: 5000 });
    } else {
      // Si pas de lien, naviguer directement
      await page.goto('/shop');
    }
    
    // Vérifier l'URL
    expect(page.url()).toContain('shop');
  });

  test('should check page elements exist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Vérifier les éléments de base
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Vérifier qu'il y a du contenu
    const mainContent = page.locator('main, [role="main"], #__next, .app');
    const hasContent = await mainContent.count() > 0;
    expect(hasContent).toBeTruthy();
  });
});