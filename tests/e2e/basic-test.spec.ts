import { test, expect } from '@playwright/test';

test.describe('Basic Test', () => {
  test('should load home page', async ({ page }) => {
    // Set test timeout to 10 seconds
    test.setTimeout(10000);
    
    // Go to home page
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
    
    // Check page loaded
    await expect(page).toHaveURL(/http:\/\/localhost:3003/);
    
    // Check basic element exists
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 2000 });
  });
});