import { test } from "@playwright/test";
import { expect } from "@playwright/test";

test("AdminTest_2025-08-11", async ({ page, context }) => {
  // Navigate to URL
  await page.goto("http://localhost:3005");

  // Navigate to URL
  await page.goto("http://localhost:3005");

  // Click element
  await page.click("text=Connexion");

  // Fill input field
  await page.fill('input[type="email"]', "inherbver@gmail.com");

  // Fill input field
  await page.fill('input[type="password"]', "Admin123!");

  // Click element
  await page.click('button:has-text("Se connecter")');

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin");

  // Click element
  await page.click("text=Produits");

  // Click element
  await page.click("text=Ajouter un produit");

  // Fill input field
  await page.fill('input[placeholder*="Prix"]', "25.50");

  // Fill input field
  await page.fill('input[placeholder="9.99"]', "25.50");

  // Fill input field
  await page.fill('input[placeholder="100"]', "50");

  // Fill input field
  await page.fill('input[placeholder="250"]', "150");

  // Click element
  await page.click("text=Traductions");

  // Click element
  await page.click("text=Dashboard");

  // Click element
  await page.click("text=Magazine");

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin");

  // Click element
  await page.click("text=Articles et blog");

  // Click element
  await page.click("nav text=Magazine");

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin/magazine");

  // Click element
  await page.click("text=Nouvel article");

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin/markets");

  // Click element
  await page.click("text=Ajouter un marché");

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin/partners");

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin/users");
});
