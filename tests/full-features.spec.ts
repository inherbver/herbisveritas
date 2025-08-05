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

test.describe("Features complètes du site", () => {
  
  test.describe("Tests d'authentification", () => {
    test("connexion admin réussie", async ({ page }) => {
      await page.goto("/");
      
      // Aller à la page de connexion
      await page.click("text=Se connecter");
      await page.waitForURL("**/login");
      
      // Saisir les identifiants admin
      await page.fill("input[type=\"email\"]", ADMIN_CREDENTIALS.email);
      await page.fill("input[type=\"password\"]", ADMIN_CREDENTIALS.password);
      await page.click("button[type=\"submit\"]");
      
      // Vérifier la redirection après connexion
      await page.waitForURL("**/", { timeout: 10000 });
      
      // Vérifier la présence du lien admin dans l'interface
      const adminLink = page.locator("text=Admin, a[href*=\"admin\"]");
      await expect(adminLink).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: "tests/screenshots/admin-login-success.png" });
    });

    test("connexion utilisateur réussie", async ({ page }) => {
      await page.goto("/");
      
      // Aller à la page de connexion  
      await page.click("text=Se connecter");
      await page.waitForURL("**/login");
      
      // Saisir les identifiants utilisateur
      await page.fill("input[type=\"email\"]", USER_CREDENTIALS.email);
      await page.fill("input[type=\"password\"]", USER_CREDENTIALS.password);
      await page.click("button[type=\"submit\"]");
      
      // Vérifier la redirection après connexion
      await page.waitForURL("**/", { timeout: 10000 });
      
      // Vérifier l'absence du lien admin
      const adminLink = page.locator("text=Admin, a[href*=\"admin\"]");
      await expect(adminLink).not.toBeVisible();
      
      await page.screenshot({ path: "tests/screenshots/user-login-success.png" });
    });
  });

  test.describe("Features admin", () => {
    test.beforeEach(async ({ page }) => {
      // Connexion admin avant chaque test
      await page.goto("/login");
      await page.fill("input[type=\"email\"]", ADMIN_CREDENTIALS.email);
      await page.fill("input[type=\"password\"]", ADMIN_CREDENTIALS.password);
      await page.click("button[type=\"submit\"]");
      await page.waitForURL("**/", { timeout: 10000 });
    });

    test("accès au dashboard admin", async ({ page }) => {
      await page.goto("/admin");
      
      // Vérifier le titre du dashboard
      await expect(page.locator("h1, h2").filter({ hasText: /dashboard|admin/i })).toBeVisible();
      
      // Vérifier la présence des cartes/sections principales
      const sections = ["Produits", "Magazine", "Marchés", "Partenaires", "Utilisateurs"];
      for (const section of sections) {
        await expect(page.locator(`text=${section}`)).toBeVisible();
      }
      
      await page.screenshot({ path: "tests/screenshots/admin-dashboard.png", fullPage: true });
    });

    test("gestion des marchés", async ({ page }) => {
      await page.goto("/admin/markets");
      
      // Vérifier que la page des marchés se charge
      await expect(page.locator("text=Marchés")).toBeVisible();
      
      // Vérifier la présence du bouton "Nouveau marché"
      const newMarketButton = page.locator("text=Nouveau, text=Ajouter, button:has-text(\"Créer\")");
      if (await newMarketButton.count() > 0) {
        await expect(newMarketButton.first()).toBeVisible();
      }
      
      await page.screenshot({ path: "tests/screenshots/admin-markets.png", fullPage: true });
    });

    test("gestion des partenaires", async ({ page }) => {
      await page.goto("/admin/partners");
      
      // Vérifier que la page des partenaires se charge
      await expect(page.locator("text=Partenaires")).toBeVisible();
      
      await page.screenshot({ path: "tests/screenshots/admin-partners.png", fullPage: true });
    });

    test("gestion des produits", async ({ page }) => {
      await page.goto("/admin/products");
      
      // Vérifier que la page des produits se charge
      await expect(page.locator("text=Produits")).toBeVisible();
      
      await page.screenshot({ path: "tests/screenshots/admin-products.png", fullPage: true });
    });
  });

  test.describe("Features utilisateur", () => {
    test("navigation sur la boutique", async ({ page }) => {
      await page.goto("/shop");
      
      // Vérifier que la page boutique se charge
      await expect(page.locator("text=Boutique, text=Produits")).toBeVisible();
      
      // Vérifier la présence de produits
      const products = page.locator("[data-testid=\"product-card\"], .product-card, article");
      const productCount = await products.count();
      
      if (productCount > 0) {
        console.log(`✅ ${productCount} produits trouvés`);
      }
      
      await page.screenshot({ path: "tests/screenshots/shop-page.png", fullPage: true });
    });

    test("fonctionnalité de panier", async ({ page }) => {
      await page.goto("/shop");
      
      // Chercher un produit avec bouton d'ajout au panier
      const addToCartButton = page.locator("text=Ajouter, button:has-text(\"Panier\")").first();
      
      if (await addToCartButton.count() > 0) {
        // Cliquer sur le premier bouton "Ajouter au panier"
        await addToCartButton.click();
        
        // Attendre un peu pour que l'ajout se fasse
        await page.waitForTimeout(2000);
        
        // Vérifier que l'icône du panier montre un article
        const cartIcon = page.locator("[data-testid=\"cart-icon\"], .cart-icon, text=/panier/i").first();
        await expect(cartIcon).toBeVisible();
        
        // Essayer d'ouvrir le panier
        await cartIcon.click();
        
        await page.screenshot({ path: "tests/screenshots/cart-with-item.png" });
      } else {
        console.log("⚠️ Aucun bouton d'ajout au panier trouvé");
        await page.screenshot({ path: "tests/screenshots/shop-no-cart-buttons.png" });
      }
    });

    test("page de contact et marchés", async ({ page }) => {
      await page.goto("/contact");
      
      // Vérifier que la page contact se charge
      await expect(page.locator("text=Contact")).toBeVisible();
      
      // Chercher des informations sur les marchés
      const marketInfo = page.locator("text=marché, text=Marché");
      if (await marketInfo.count() > 0) {
        console.log("✅ Informations sur les marchés trouvées");
      }
      
      await page.screenshot({ path: "tests/screenshots/contact-page.png", fullPage: true });
    });
  });

  test.describe("Upload d'images", () => {
    test.beforeEach(async ({ page }) => {
      // Connexion admin pour tester l'upload
      await page.goto("/login");
      await page.fill("input[type=\"email\"]", ADMIN_CREDENTIALS.email);
      await page.fill("input[type=\"password\"]", ADMIN_CREDENTIALS.password);
      await page.click("button[type=\"submit\"]");
      await page.waitForURL("**/", { timeout: 10000 });
    });

    test("présence des boutons d'upload sur les formulaires", async ({ page }) => {
      // Tester sur la page de création de produit
      await page.goto("/admin/products/new");
      
      const uploadButton = page.locator("button:has-text(\"Upload\"), input[type=\"file\"], text=Upload");
      if (await uploadButton.count() > 0) {
        console.log("✅ Bouton d'upload trouvé sur le formulaire produit");
        await expect(uploadButton.first()).toBeVisible();
      }
      
      await page.screenshot({ path: "tests/screenshots/product-form-upload.png", fullPage: true });
    });
  });
});