import { test, expect } from '@playwright/test';

test.describe('Diagnostic Tests', () => {
  test('should load home page', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });
    
    // Check if page title exists
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('Page title:', title);
    
    // Check if body element is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to shop page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try different selectors for shop link
    const shopLink = page.locator('a[href*="/shop"], a:has-text("Boutique"), text=Boutique').first();
    
    if (await shopLink.isVisible()) {
      await shopLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check URL
      expect(page.url()).toContain('shop');
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/shop-page.png', fullPage: true });
    } else {
      console.log('Shop link not found');
      // Log page content for debugging
      const links = await page.locator('a').allTextContents();
      console.log('Available links:', links);
    }
  });

  test('should check authentication elements', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of signin page
    await page.screenshot({ path: 'test-results/signin-page.png', fullPage: true });
    
    // Check for form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], #email');
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
    
    console.log('Email input visible:', await emailInput.isVisible());
    console.log('Password input visible:', await passwordInput.isVisible());
    
    // Log all form inputs for debugging
    const inputs = await page.locator('input').all();
    console.log('Number of input fields:', inputs.length);
  });
});