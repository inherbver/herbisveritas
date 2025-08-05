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

test.describe("Tests des fonctionnalités principales", () => {
  
  test("Page d'accueil - Vérification de base", async ({ page }) => {
    await page.goto("/");
    
    // Vérifier que la page se charge
    await expect(page).toHaveTitle(/herbis/i);
    
    // Vérifier la présence d'éléments de navigation
    await expect(page.locator("nav")).toBeVisible();
    
    // Prendre une capture d'écran
    await page.screenshot({ path: "tests/screenshots/homepage-main.png" });
    
    console.log("✅ Page d'accueil chargée avec succès");
  });

  test("Connexion utilisateur standard", async ({ page }) => {
    await page.goto("/login");
    
    // Attendre que la page de connexion soit chargée
    await expect(page.locator("input[type=\"email\"]")).toBeVisible();
    
    // Saisir les identifiants utilisateur
    await page.fill("input[type=\"email\"]", USER_CREDENTIALS.email);
    await page.fill("input[type=\"password\"]", USER_CREDENTIALS.password);
    
    // Cliquer sur le bouton de connexion
    await page.click("button[type=\"submit\"]");
    
    // Attendre la redirection (timeout plus long pour les connexions)
    await page.waitForURL("**/", { timeout: 20000 });
    
    // Vérifier que l'utilisateur est connecté (chercher un indicateur de connexion)
    // Cela peut être un menu utilisateur, un bouton de déconnexion, etc.
    const userIndicator = page.locator("[data-testid=\"user-menu\"], .user-menu, text=Profil, text=Déconnexion").first();
    await expect(userIndicator).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/user-login-success.png" });
    
    console.log("✅ Connexion utilisateur réussie");
  });

  test("Connexion administrateur", async ({ page }) => {
    await page.goto("/login");
    
    // Attendre que la page de connexion soit chargée
    await expect(page.locator("input[type=\"email\"]")).toBeVisible();
    
    // Saisir les identifiants admin
    await page.fill("input[type=\"email\"]", ADMIN_CREDENTIALS.email);
    await page.fill("input[type=\"password\"]", ADMIN_CREDENTIALS.password);
    
    // Cliquer sur le bouton de connexion
    await page.click("button[type=\"submit\"]");
    
    // Attendre la redirection
    await page.waitForURL("**/", { timeout: 20000 });
    
    // Vérifier la présence du lien admin ou d'un indicateur d'administration
    const adminAccess = page.locator("text=Admin, a[href*=\"admin\"], [data-testid=\"admin-link\"]").first();
    await expect(adminAccess).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/admin-login-success.png" });
    
    console.log("✅ Connexion administrateur réussie");
  });

  test("Navigation vers la boutique", async ({ page }) => {
    await page.goto("/shop");
    
    // Vérifier que la page boutique se charge
    await expect(page.locator("h1, [data-testid=\"shop-title\"]")).toBeVisible();
    
    // Vérifier la présence de produits ou d'une grille de produits
    const productGrid = page.locator("[data-testid=\"product-grid\"], .product-grid, .products").first();
    await expect(productGrid).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/shop-page.png" });
    
    console.log("✅ Page boutique accessible");
  });

  test("Test du panier - Ajout d'un produit", async ({ page }) => {
    // Aller à la boutique
    await page.goto("/shop");
    
    // Attendre que les produits se chargent
    await page.waitForSelector("[data-testid=\"product-card\"], .product-card", { timeout: 10000 });
    
    // Cliquer sur le premier produit disponible
    const firstProduct = page.locator("[data-testid=\"product-card\"], .product-card").first();
    await firstProduct.click();
    
    // Attendre d'être sur la page produit
    await page.waitForURL("**/shop/**");
    
    // Chercher et cliquer sur le bouton d'ajout au panier
    const addToCartButton = page.locator("button:has-text(\"Ajouter\"), [data-testid=\"add-to-cart\"], button[type=\"submit\"]").first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();
    
    // Vérifier qu'une notification ou indication d'ajout au panier apparaît
    const cartIndicator = page.locator("[data-testid=\"cart-count\"], .cart-count, text=ajouté").first();
    await expect(cartIndicator).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: "tests/screenshots/product-added-to-cart.png" });
    
    console.log("✅ Produit ajouté au panier avec succès");
  });

  test("Accès à l'interface d'administration (admin uniquement)", async ({ page }) => {
    // D'abord se connecter en tant qu'admin
    await page.goto("/login");
    await page.fill("input[type=\"email\"]", ADMIN_CREDENTIALS.email);
    await page.fill("input[type=\"password\"]", ADMIN_CREDENTIALS.password);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("**/", { timeout: 20000 });
    
    // Naviguer vers l'interface d'administration
    await page.goto("/admin");
    
    // Vérifier que la page d'administration se charge
    await expect(page.locator("h1:has-text(\"Admin\"), [data-testid=\"admin-dashboard\"]")).toBeVisible({ timeout: 10000 });
    
    // Vérifier la présence d'éléments d'administration (tableaux de bord, gestion des produits, etc.)
    const adminElements = page.locator("[data-testid=\"admin-nav\"], .admin-nav, text=Produits, text=Utilisateurs").first();
    await expect(adminElements).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: "tests/screenshots/admin-dashboard.png" });
    
    console.log("✅ Interface d'administration accessible");
  });

  test("Déconnexion", async ({ page }) => {
    // Se connecter d'abord
    await page.goto("/login");
    await page.fill("input[type=\"email\"]", USER_CREDENTIALS.email);
    await page.fill("input[type=\"password\"]", USER_CREDENTIALS.password);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("**/", { timeout: 20000 });
    
    // Chercher et cliquer sur le bouton de déconnexion
    const logoutButton = page.locator("button:has-text(\"Déconnexion\"), a:has-text(\"Déconnexion\"), [data-testid=\"logout\"]").first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
    
    // Vérifier que l'utilisateur est redirigé vers la page de connexion ou d'accueil
    await page.waitForURL("**/", { timeout: 10000 });
    
    // Vérifier que le bouton de connexion est à nouveau visible
    const loginButton = page.locator("text=Se connecter, a[href*=\"login\"], [data-testid=\"login-link\"]").first();
    await expect(loginButton).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: "tests/screenshots/logout-success.png" });
    
    console.log("✅ Déconnexion réussie");
  });
});
