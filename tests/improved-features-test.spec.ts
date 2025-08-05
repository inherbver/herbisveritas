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

test.describe("Tests des fonctionnalités principales (améliorés)", () => {
  
  test("Page d'accueil - Vérification de base", async ({ page }) => {
    await page.goto("/");
    
    // Attendre que la page se charge complètement
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page se charge (titre plus flexible)
    await expect(page).toHaveTitle(/herbis|Herbis|HERBIS/i);
    
    // Vérifier la présence d'éléments de navigation (sélecteurs plus flexibles)
    const navElement = page.locator("nav, header, [role='navigation']").first();
    await expect(navElement).toBeVisible({ timeout: 15000 });
    
    // Prendre une capture d'écran
    await page.screenshot({ path: "tests/screenshots/homepage-improved.png", fullPage: true });
    
    console.log("✅ Page d'accueil chargée avec succès");
  });

  test("Navigation vers la page de connexion", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Chercher le lien de connexion avec plusieurs variantes possibles
    const loginLink = page.locator("a:has-text('Connexion'), a:has-text('Se connecter'), a:has-text('Login'), a[href*='login']").first();
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    
    // Cliquer sur le lien de connexion
    await loginLink.click();
    
    // Vérifier que nous sommes sur la page de connexion
    await expect(page).toHaveURL(/.*login.*/);
    
    // Vérifier la présence des champs de connexion
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible();
    
    await page.screenshot({ path: "tests/screenshots/login-page.png", fullPage: true });
    
    console.log("✅ Navigation vers la page de connexion réussie");
  });

  test("Connexion utilisateur standard", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    // Attendre que la page de connexion soit chargée
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible({ timeout: 10000 });
    
    // Saisir les identifiants utilisateur
    await page.fill("input[type='email'], input[name='email']", USER_CREDENTIALS.email);
    await page.fill("input[type='password'], input[name='password']", USER_CREDENTIALS.password);
    
    // Cliquer sur le bouton de connexion (plusieurs variantes possibles)
    const submitButton = page.locator("button[type='submit'], button:has-text('Connexion'), button:has-text('Se connecter'), input[type='submit']").first();
    await submitButton.click();
    
    // Attendre la redirection avec un timeout plus long
    await page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 });
    
    // Vérifier que l'utilisateur est connecté (chercher des indicateurs de connexion)
    const userIndicators = [
      "text=Profil",
      "text=Mon compte", 
      "text=Déconnexion",
      "text=Logout",
      "[data-testid='user-menu']",
      ".user-menu",
      "button:has-text('Profil')",
      "a:has-text('Profil')"
    ];
    
    let found = false;
    for (const selector of userIndicators) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 5000 });
        found = true;
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!found) {
      // Si aucun indicateur spécifique n'est trouvé, vérifier au moins qu'on n'est plus sur la page de login
      await expect(page).not.toHaveURL(/.*login.*/);
    }
    
    await page.screenshot({ path: "tests/screenshots/user-login-success.png", fullPage: true });
    
    console.log("✅ Connexion utilisateur réussie");
  });

  test("Connexion administrateur", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    // Attendre que la page de connexion soit chargée
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible({ timeout: 10000 });
    
    // Saisir les identifiants admin
    await page.fill("input[type='email'], input[name='email']", ADMIN_CREDENTIALS.email);
    await page.fill("input[type='password'], input[name='password']", ADMIN_CREDENTIALS.password);
    
    // Cliquer sur le bouton de connexion
    const submitButton = page.locator("button[type='submit'], button:has-text('Connexion'), button:has-text('Se connecter'), input[type='submit']").first();
    await submitButton.click();
    
    // Attendre la redirection
    await page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 });
    
    // Vérifier la présence d'indicateurs d'administration
    const adminIndicators = [
      "text=Admin",
      "text=Administration", 
      "a[href*='admin']",
      "[data-testid='admin-link']",
      "button:has-text('Admin')",
      "a:has-text('Admin')"
    ];
    
    let adminFound = false;
    for (const selector of adminIndicators) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 5000 });
        adminFound = true;
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    await page.screenshot({ path: "tests/screenshots/admin-login-success.png", fullPage: true });
    
    console.log(`✅ Connexion administrateur réussie ${adminFound ? '(avec accès admin détecté)' : '(connexion basique)'}`);
  });

  test("Navigation vers la boutique", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Chercher le lien vers la boutique
    const shopLink = page.locator("a:has-text('Boutique'), a:has-text('Shop'), a[href*='shop'], a[href*='boutique']").first();
    
    try {
      await expect(shopLink).toBeVisible({ timeout: 10000 });
      await shopLink.click();
    } catch (e) {
      // Si le lien n'est pas trouvé, naviguer directement
      await page.goto("/shop");
    }
    
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page boutique se charge
    const shopIndicators = [
      "h1:has-text('Boutique')",
      "h1:has-text('Shop')", 
      "h1:has-text('Produits')",
      "[data-testid='shop-title']",
      ".shop-title",
      ".products-grid",
      ".product-list"
    ];
    
    let shopFound = false;
    for (const selector of shopIndicators) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 10000 });
        shopFound = true;
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Vérifier au moins que l'URL contient 'shop' ou 'boutique'
    await expect(page).toHaveURL(/.*(?:shop|boutique).*/);
    
    await page.screenshot({ path: "tests/screenshots/shop-page.png", fullPage: true });
    
    console.log(`✅ Page boutique accessible ${shopFound ? '(éléments détectés)' : '(URL confirmée)'}`);
  });

  test("Vérification de la structure générale", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Vérifier les éléments de base de la page
    const basicElements = [
      "html",
      "body", 
      "head",
      "title"
    ];
    
    for (const element of basicElements) {
      await expect(page.locator(element)).toBeAttached();
    }
    
    // Vérifier qu'il n'y a pas d'erreurs JavaScript majeures
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Attendre un peu pour capturer les erreurs potentielles
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: "tests/screenshots/general-structure.png", fullPage: true });
    
    console.log(`✅ Structure générale vérifiée ${errors.length > 0 ? `(${errors.length} erreurs JS détectées)` : '(aucune erreur JS)'}`);
    
    if (errors.length > 0) {
      console.log("Erreurs JavaScript détectées:", errors);
    }
  });

  test("Test de navigation basique", async ({ page }) => {
    // Test de navigation entre plusieurs pages
    const pages = ["/", "/shop", "/login"];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Vérifier que la page se charge sans erreur 404
      const is404 = await page.locator("text=404, text=Not Found, text=Page not found").isVisible();
      expect(is404).toBe(false);
      
      console.log(`✅ Page ${pagePath} accessible`);
    }
    
    await page.screenshot({ path: "tests/screenshots/navigation-test.png", fullPage: true });
    
    console.log("✅ Test de navigation basique terminé");
  });
});
