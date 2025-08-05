import { test, expect } from "@playwright/test";

// Configuration des comptes de test
const ADMIN_CREDENTIALS = {
  email: "inherbver@gmail.com",
  password: "Admin1234!"
};

const USER_CREDENTIALS = {
  email: "omar.mbengue31000@gmail.com", 
  password: "User1234!"
};

test.describe("Tests de fumée basiques", () => {
  
  test("vérification de l'accueil", async ({ page }) => {
    await page.goto("/");
    
    // Vérifier que la page se charge
    await expect(page).toHaveTitle(/herbis/i);
    
    // Vérifier la présence d'éléments de navigation
    const loginButton = page.locator("text=Se connecter, a[href*=\"login\"]");
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/homepage.png" });
  });

  test("connexion admin simple", async ({ page }) => {
    await page.goto("/login");
    
    // Saisir les identifiants admin
    await page.fill("input[type=\"email\"]", ADMIN_CREDENTIALS.email);
    await page.fill("input[type=\"password\"]", ADMIN_CREDENTIALS.password);
    await page.click("button[type=\"submit\"]");
    
    // Attendre la redirection
    await page.waitForURL("**/", { timeout: 15000 });
    
    // Vérifier la présence du lien admin
    const adminAccess = page.locator("text=Admin, a[href*=\"admin\"]");
    await expect(adminAccess).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/admin-login.png" });
  });

  test("accès à la boutique", async ({ page }) => {
    await page.goto("/shop");
    
    // Vérifier que la page boutique se charge
    await expect(page.locator("text=Boutique, text=Produits, h1, h2")).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/shop.png" });
  });
});