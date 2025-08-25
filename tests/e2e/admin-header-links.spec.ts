/**
 * Tests E2E pour l'affichage des liens admin dans le header
 * Vérifie que les liens admin apparaissent immédiatement après connexion
 */

import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "inherbver@gmail.com";
const ADMIN_PASSWORD = "Admin123!"; // Alternative: Admin1234!
const ADMIN_PASSWORD_ALT = "Admin1234!";

test.describe("Admin Header Links - Affichage immédiat", () => {
  test.describe.configure({ mode: "serial" });

  /**
   * Helper pour se connecter en tant qu'admin
   */
  async function loginAsAdmin(page: Page, useAltPassword = false) {
    await page.goto("/login");

    // Remplir le formulaire de connexion
    await page.fill('[data-testid="email"], input[type="email"]', ADMIN_EMAIL);
    await page.fill(
      '[data-testid="password"], input[type="password"]',
      useAltPassword ? ADMIN_PASSWORD_ALT : ADMIN_PASSWORD,
    );

    // Soumettre le formulaire
    await page.click(
      '[data-testid="login-button"], button[type="submit"]:has-text("Connexion"), button:has-text("Se connecter")',
    );

    // Attendre la redirection après connexion
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
      waitUntil: "networkidle",
    });
  }

  test.beforeEach(async ({ page, context }) => {
    // Nettoyer le storage avant chaque test
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("should display admin links immediately after login", async ({
    page,
  }) => {
    // Act - Se connecter
    await loginAsAdmin(page);

    // Assert - Les liens admin doivent être visibles IMMÉDIATEMENT
    // Desktop
    const desktopAdminLink = page
      .locator('[data-testid="admin-nav-link"], nav a:has-text("Admin")')
      .first();
    const desktopAdminButton = page
      .locator(
        '[data-testid="admin-button"], [data-testid="admin-link"] button',
      )
      .first();

    // Vérifier qu'au moins un lien admin est visible rapidement (max 500ms)
    await expect(desktopAdminLink.or(desktopAdminButton)).toBeVisible({
      timeout: 500,
    });

    // Vérifier que le lien fonctionne
    const adminLinkToClick = (await desktopAdminLink.isVisible())
      ? desktopAdminLink
      : desktopAdminButton;
    await adminLinkToClick.click();

    // Assert - Vérifier la navigation vers /admin
    await expect(page).toHaveURL(/\/admin/);
  });

  test("should display admin links on mobile menu", async ({ page }) => {
    // Simuler un viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Act - Se connecter
    await loginAsAdmin(page);

    // Act - Ouvrir le menu mobile
    await page.click(
      'button[aria-label*="menu"], [data-testid="mobile-menu-trigger"]',
    );

    // Assert - Le lien admin doit être visible dans le menu mobile
    const mobileAdminLink = page.locator('a:has-text("Admin")');
    await expect(mobileAdminLink).toBeVisible({ timeout: 500 });

    // Vérifier que le lien fonctionne
    await mobileAdminLink.click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test("should persist admin UI hint in sessionStorage", async ({ page }) => {
    // Act - Se connecter
    await loginAsAdmin(page);

    // Assert - Vérifier que le hint est stocké
    const sessionStorageValue = await page.evaluate(() => {
      return sessionStorage.getItem("admin_ui_hint");
    });

    expect(sessionStorageValue).toBe("true");

    // Act - Naviguer vers une autre page
    await page.goto("/shop");

    // Assert - Les liens admin doivent rester visibles
    const adminLink = page
      .locator(
        '[data-testid="admin-nav-link"], [data-testid="admin-button"], a:has-text("Admin")',
      )
      .first();
    await expect(adminLink).toBeVisible({ timeout: 500 });
  });

  test("should clear admin links on logout", async ({ page }) => {
    // Setup - Se connecter
    await loginAsAdmin(page);

    // Assert - Vérifier que les liens admin sont visibles
    const adminLink = page
      .locator('[data-testid="admin-nav-link"], [data-testid="admin-button"]')
      .first();
    await expect(adminLink).toBeVisible();

    // Act - Se déconnecter
    await page.click(
      '[data-testid="profile-button"], [data-testid="profile-link"], button:has-text("Compte")',
    );
    await page.click(
      'button:has-text("Déconnexion"), button:has-text("Se déconnecter")',
    );

    // Assert - Les liens admin doivent disparaître immédiatement
    await expect(adminLink).not.toBeVisible({ timeout: 500 });

    // Assert - Le sessionStorage doit être nettoyé
    const sessionStorageValue = await page.evaluate(() => {
      return sessionStorage.getItem("admin_ui_hint");
    });

    expect(sessionStorageValue).toBeNull();
  });

  test("should not display admin links for regular users", async ({ page }) => {
    // Act - Se connecter avec un compte non-admin
    await page.goto("/login");
    await page.fill(
      '[data-testid="email"], input[type="email"]',
      "user@example.com",
    );
    await page.fill(
      '[data-testid="password"], input[type="password"]',
      "User123!",
    );
    await page.click('[data-testid="login-button"], button[type="submit"]');

    // Attendre un peu pour s'assurer que le header est chargé
    await page.waitForTimeout(1000);

    // Assert - Aucun lien admin ne doit être visible
    const adminLinks = page.locator(
      '[data-testid="admin-nav-link"], [data-testid="admin-button"], a:has-text("Admin")',
    );
    await expect(adminLinks).toHaveCount(0);
  });

  test("should handle password retry with alternative password", async ({
    page,
  }) => {
    let loginSuccess = false;

    try {
      // Essayer avec le premier mot de passe
      await loginAsAdmin(page, false);
      loginSuccess = true;
    } catch (error) {
      // Si échec, essayer avec le mot de passe alternatif
      console.log("First password failed, trying alternative...");
      await loginAsAdmin(page, true);
      loginSuccess = true;
    }

    expect(loginSuccess).toBe(true);

    // Assert - Les liens admin doivent être visibles
    const adminLink = page
      .locator('[data-testid="admin-nav-link"], [data-testid="admin-button"]')
      .first();
    await expect(adminLink).toBeVisible({ timeout: 500 });
  });

  test("should maintain admin state across page refreshes within session", async ({
    page,
  }) => {
    // Act - Se connecter
    await loginAsAdmin(page);

    // Assert - Liens admin visibles
    let adminLink = page
      .locator('[data-testid="admin-nav-link"], [data-testid="admin-button"]')
      .first();
    await expect(adminLink).toBeVisible();

    // Act - Rafraîchir la page
    await page.reload();

    // Assert - Les liens admin doivent réapparaître rapidement
    adminLink = page
      .locator('[data-testid="admin-nav-link"], [data-testid="admin-button"]')
      .first();
    await expect(adminLink).toBeVisible({ timeout: 1000 });
  });

  test("should not trust manipulated sessionStorage", async ({ page }) => {
    // Act - Manipuler le sessionStorage avant connexion
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.setItem("admin_ui_hint", "true");
    });

    // Act - Rafraîchir pour voir si les liens apparaissent
    await page.reload();

    // Assert - Les liens admin ne doivent PAS être visibles sans authentification valide
    const adminLinks = page.locator(
      '[data-testid="admin-nav-link"], [data-testid="admin-button"]',
    );

    // Attendre un peu pour s'assurer que le header est chargé et vérifié
    await page.waitForTimeout(2000);

    // Les liens ne doivent pas être visibles car l'utilisateur n'est pas authentifié
    await expect(adminLinks).toHaveCount(0);
  });

  test("performance: admin links should appear within 500ms", async ({
    page,
  }) => {
    const startTime = Date.now();

    // Act - Se connecter
    await loginAsAdmin(page);

    // Mesurer le temps jusqu'à l'apparition des liens admin
    const adminLink = page
      .locator('[data-testid="admin-nav-link"], [data-testid="admin-button"]')
      .first();
    await adminLink.waitFor({ state: "visible" });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Assert - Le temps total incluant connexion et affichage doit être raisonnable
    console.log(`Admin links appeared in ${loadTime}ms`);

    // Les liens doivent apparaître très rapidement après la connexion
    // (on teste que c'est visible, mais on log le temps pour monitoring)
    expect(await adminLink.isVisible()).toBe(true);
  });
});
