import { test } from "@playwright/test";
import { expect } from "@playwright/test";

test("SecurityTest_2025-08-11", async ({ page, context }) => {
  // Navigate to URL
  await page.goto("http://localhost:3005");

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin");

  // Fill input field
  await page.fill('input[type="email"]', "omar.mbengue31000@gmail.com");

  // Fill input field
  await page.fill('input[type="password"]', "User1234!");

  // Click element
  await page.click('button:has-text("Se connecter")');

  // Navigate to URL
  await page.goto("http://localhost:3005/fr/admin");
});
