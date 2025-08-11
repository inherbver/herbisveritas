import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "test.user@example.com",
  password: "TestPassword123!",
  name: "Test User",
};

const ADMIN_USER = {
  email: "inherbver@gmail.com",
  password: "Admin123!",
};

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("Admin signin and signout", async ({ page }) => {
    // Navigate to login page
    await page.click('button:has-text("Connexion"), a:has-text("Connexion")');

    // Fill login form
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation and verify admin access
    await page.waitForURL("**/profile");
    await expect(page.locator("text=Admin")).toBeVisible();
    await expect(page.locator("text=Mon compte")).toBeVisible();

    // Verify user email is displayed
    await expect(page.locator(`text=${ADMIN_USER.email}`)).toBeVisible();

    // Test signout
    await page.click('button:has-text("Se déconnecter")');

    // Verify logged out state
    await page.waitForURL("http://localhost:3000/");
    await expect(page.locator('button:has-text("Connexion")')).toBeVisible();
    await expect(page.locator('button:has-text("S\'inscrire")')).toBeVisible();
  });

  test("User signup flow", async ({ page }) => {
    // Navigate to signup page
    await page.click('button:has-text("S\'inscrire"), a:has-text("S\'inscrire")');

    // Fill signup form
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);

    // Verify password strength indicators
    await expect(page.locator("text=Au moins 8 caractères")).toBeVisible();
    await expect(page.locator("text=Au moins une majuscule")).toBeVisible();
    await expect(page.locator("text=Au moins un chiffre")).toBeVisible();
    await expect(page.locator("text=Au moins un caractère spécial")).toBeVisible();

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for confirmation or redirect
    await page.waitForTimeout(2000);

    // Check if signup was successful
    const confirmationVisible = await page
      .locator("text=/vérifi|confirm|succès/i")
      .isVisible()
      .catch(() => false);
    const profileVisible = await page.url().includes("/profile");

    expect(confirmationVisible || profileVisible).toBeTruthy();
  });

  test("Invalid login shows error", async ({ page }) => {
    // Navigate to login page
    await page.click('button:has-text("Connexion"), a:has-text("Connexion")');

    // Fill login form with invalid credentials
    await page.fill('input[type="email"]', "invalid@example.com");
    await page.fill('input[type="password"]', "WrongPassword123!");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Verify error message appears
    const errorVisible = await page
      .locator("text=/incorrect|invalide|erreur/i")
      .isVisible()
      .catch(() => false);
    const stillOnLoginPage =
      (await page.url().includes("/login")) || (await page.url().includes("/signin"));

    expect(errorVisible || stillOnLoginPage).toBeTruthy();
  });

  test("Password validation on signup", async ({ page }) => {
    // Navigate to signup page
    await page.click('button:has-text("S\'inscrire"), a:has-text("S\'inscrire")');

    // Test weak password
    await page.fill('input[name="password"]', "weak");

    // Verify validation messages
    const validationMessages = page.locator("text=/Au moins/");
    await expect(validationMessages).toHaveCount(4);

    // Test strong password
    await page.fill('input[name="password"]', "StrongPassword123!");

    // Verify all validations pass
    await expect(page.locator("svg.text-green-500")).toHaveCount(4);

    // Test password mismatch
    await page.fill('input[name="confirmPassword"]', "DifferentPassword123!");
    await expect(page.locator("text=/ne correspondent pas/i")).toBeVisible();

    // Fix password mismatch
    await page.fill('input[name="confirmPassword"]', "StrongPassword123!");
    const mismatchError = page.locator("text=/ne correspondent pas/i");
    await expect(mismatchError).not.toBeVisible();
  });
});
