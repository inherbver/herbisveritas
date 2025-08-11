import { test } from "@playwright/test";
import { expect } from "@playwright/test";

test("AuthTest_2025-08-11", async ({ page, context }) => {
  // Navigate to URL
  await page.goto("http://localhost:3005");

  // Take screenshot
  await page.screenshot({ path: "initial-page.png", fullPage: true });

  // Click element
  await page.click("text=Connexion");

  // Fill input field
  await page.fill('input[type="email"]', "omar.mbengue31000@gmail.com");

  // Fill input field
  await page.fill('input[type="password"]', "User1234!");

  // Click element
  await page.click('button:has-text("Se connecter")');

  // Click element
  await page.click("text=Se déconnecter");

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
});
