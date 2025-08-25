import { test, expect } from "@playwright/test";

test("admin login and header links", async ({ page }) => {
  // 1. Aller à la page de connexion
  await page.goto("http://localhost:3010/login");

  // 2. Se connecter avec les credentials admin
  await page.fill('input[type="email"]', "inherbver@gmail.com");
  await page.fill('input[type="password"]', "Admin123!");

  // 3. Cliquer sur le bouton de connexion
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.click('button[type="submit"]'),
  ]);

  // 4. Vérifier que les liens admin apparaissent rapidement
  const adminLink = page.locator('a:has-text("Admin")').first();
  await expect(adminLink).toBeVisible({ timeout: 2000 });

  console.log("✅ Test passé : Les liens admin sont visibles après connexion");
});
