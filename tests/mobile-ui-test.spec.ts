import { test, expect, devices } from "@playwright/test";

// Use iPhone 13 viewport
test.use({
  ...devices["iPhone 13"],
});

test.describe("Mobile UI/UX Improvements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3004");
  });

  test("should have mobile-optimized header", async ({ page }) => {
    // Check mobile menu button exists and is visible
    const menuButton = page.locator("button:has(svg.lucide-menu)");
    await expect(menuButton).toBeVisible();

    // Check menu button has proper touch target size (44px minimum)
    const buttonBox = await menuButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  });

  test("should open mobile menu with proper width", async ({ page }) => {
    // Click menu button
    await page.click("button:has(svg.lucide-menu)");

    // Check menu sheet is visible
    const menuSheet = page.locator('[role="dialog"]').first();
    await expect(menuSheet).toBeVisible();

    // Check menu width is optimized for mobile (85vw or less)
    const menuBox = await menuSheet.boundingBox();
    const viewportSize = page.viewportSize();
    if (viewportSize && menuBox) {
      expect(menuBox.width).toBeLessThanOrEqual(viewportSize.width * 0.85);
    }
  });

  test("should have touch-optimized product cards", async ({ page }) => {
    await page.goto("http://localhost:3004/fr/shop");

    // Check product cards exist
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards.first()).toBeVisible();

    // Check "Add to Cart" buttons have proper height
    const addToCartButton = productCards.first().locator('button:has-text("Ajouter au panier")');
    const buttonBox = await addToCartButton.boundingBox();
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("should have mobile bottom navigation", async ({ page }) => {
    // Check if bottom navigation exists
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    // Check all navigation items
    const navItems = bottomNav.locator("a, button");
    const navCount = await navItems.count();
    expect(navCount).toBe(4); // Home, Shop, Cart, Account

    // Check each nav item has proper touch target
    for (let i = 0; i < navCount; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("should have optimized cart sheet for mobile", async ({ page }) => {
    await page.goto("http://localhost:3004/fr/shop");

    // Add item to cart
    await page.locator('button:has-text("Ajouter au panier")').first().click();

    // Open cart
    const cartButton = page.locator("button:has(svg.lucide-shopping-cart)").first();
    await cartButton.click();

    // Check cart sheet is visible
    const cartSheet = page.locator('[role="dialog"]:has-text("Votre panier")');
    await expect(cartSheet).toBeVisible();

    // Check cart sheet height is optimized for mobile
    const cartBox = await cartSheet.boundingBox();
    const viewportSize = page.viewportSize();
    if (viewportSize && cartBox) {
      // Should be approximately 85vh
      expect(cartBox.height).toBeGreaterThan(viewportSize.height * 0.8);
      expect(cartBox.height).toBeLessThan(viewportSize.height * 0.9);
    }
  });

  test("should have touch-friendly quantity controls", async ({ page }) => {
    await page.goto("http://localhost:3004/fr/shop");

    // Add item to cart
    await page.locator('button:has-text("Ajouter au panier")').first().click();

    // Open cart
    const cartButton = page.locator("button:has(svg.lucide-shopping-cart)").first();
    await cartButton.click();

    // Check quantity controls
    const decrementButton = page.locator('button[aria-label*="Diminuer"]').first();
    const incrementButton = page.locator('button[aria-label*="Augmenter"]').first();

    // Check buttons have proper size
    const decBox = await decrementButton.boundingBox();
    const incBox = await incrementButton.boundingBox();

    if (decBox && incBox) {
      expect(decBox.width).toBeGreaterThanOrEqual(40);
      expect(decBox.height).toBeGreaterThanOrEqual(40);
      expect(incBox.width).toBeGreaterThanOrEqual(40);
      expect(incBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("should have proper touch feedback", async ({ page }) => {
    await page.goto("http://localhost:3004/fr/shop");

    // Check buttons have active states
    const button = page.locator('button:has-text("Ajouter au panier")').first();

    // Get button classes
    const classes = await button.getAttribute("class");
    expect(classes).toContain("active:scale-95");
  });

  test("should handle mobile viewport correctly", async ({ page }) => {
    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("width=device-width");
    expect(viewport).toContain("initial-scale=1");

    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test("should have accessible mobile navigation", async ({ page }) => {
    // Check ARIA labels
    const menuButton = page.locator("button:has(svg.lucide-menu)");
    const ariaLabel = await menuButton.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();

    // Check focus management
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test("should maintain performance on mobile", async ({ page }) => {
    // Measure First Contentful Paint
    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((entry) => entry.name === "first-contentful-paint");
      return {
        fcp: fcp?.startTime,
      };
    });

    // FCP should be under 2 seconds on mobile
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(2000);
    }
  });
});
