import { test, expect, Page } from "@playwright/test";

// Configuration de test
const ADMIN_EMAIL = "inherbver@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// Helper pour la connexion admin
async function loginAsAdmin(page: Page) {
  await page.goto("/fr/login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Attendre la redirection et vérifier qu'on est connecté
  await page.waitForURL("**/shop");
  
  // Vérifier que les liens admin sont visibles
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
}

test.describe("Admin Dashboard - Navigation & Access", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should access admin dashboard", async ({ page }) => {
    await page.goto("/fr/admin");
    
    // Vérifier le titre du dashboard
    await expect(page).toHaveTitle(/Admin/);
    
    // Vérifier les sections principales
    await expect(page.getByText("Tableau de bord")).toBeVisible();
    
    // Vérifier la présence du menu de navigation
    const navSections = [
      "Produits",
      "Commandes", 
      "Utilisateurs",
      "Magazine",
      "Marchés",
      "Partenaires",
      "Newsletter"
    ];
    
    for (const section of navSections) {
      await expect(page.getByRole("link", { name: section })).toBeVisible();
    }
  });

  test("should display activity log", async ({ page }) => {
    await page.goto("/fr/admin");
    
    // Vérifier la section des activités récentes
    await expect(page.getByText("Activité récente")).toBeVisible();
    
    // Vérifier qu'il y a au moins une entrée
    const activityEntries = page.locator("[data-testid='activity-entry']");
    await expect(activityEntries.first()).toBeVisible();
  });

  test("should navigate between admin sections", async ({ page }) => {
    await page.goto("/fr/admin");
    
    // Naviguer vers les produits
    await page.click('a[href*="/admin/products"]');
    await expect(page).toHaveURL(/.*\/admin\/products/);
    await expect(page.getByText("Gestion des produits")).toBeVisible();
    
    // Naviguer vers les commandes
    await page.click('a[href*="/admin/orders"]');
    await expect(page).toHaveURL(/.*\/admin\/orders/);
    await expect(page.getByText("Gestion des commandes")).toBeVisible();
    
    // Naviguer vers les utilisateurs
    await page.click('a[href*="/admin/users"]');
    await expect(page).toHaveURL(/.*\/admin\/users/);
    await expect(page.getByText("Gestion des utilisateurs")).toBeVisible();
  });

  test("should handle unauthorized access", async ({ page, context }) => {
    // Se déconnecter
    await context.clearCookies();
    
    // Essayer d'accéder au dashboard sans être connecté
    await page.goto("/fr/admin");
    
    // Vérifier la redirection vers la page de connexion
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe("Admin Dashboard - Mobile View", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display mobile navigation", async ({ page }) => {
    await page.goto("/fr/admin");
    
    // Vérifier la navigation mobile
    await expect(page.getByText("Navigation rapide")).toBeVisible();
    
    // Vérifier le menu hamburger
    const menuButton = page.locator('button[aria-label*="menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Vérifier que le menu s'ouvre
      await expect(page.getByRole("navigation")).toBeVisible();
    }
  });
});

test.describe("Admin Dashboard - Performance", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load dashboard within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/fr/admin");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;
    
    // Le dashboard devrait charger en moins de 3 secondes
    expect(loadTime).toBeLessThan(3000);
  });

  test("should handle concurrent requests", async ({ page }) => {
    await page.goto("/fr/admin");
    
    // Effectuer plusieurs actions simultanées
    const promises = [
      page.locator("[data-testid='stats-card-products']").textContent(),
      page.locator("[data-testid='stats-card-orders']").textContent(),
      page.locator("[data-testid='stats-card-users']").textContent(),
    ];
    
    // Toutes les requêtes doivent aboutir
    const results = await Promise.all(promises);
    results.forEach(result => {
      expect(result).toBeTruthy();
    });
  });
});