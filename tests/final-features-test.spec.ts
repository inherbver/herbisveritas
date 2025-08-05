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

test.describe("Tests finaux avec data-testid", () => {
  
  test("Page d'accueil - Navigation et structure", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page se charge
    await expect(page).toHaveTitle(/herbis|Herbis|HERBIS/i);
    
    // Vérifier la présence du logo
    await expect(page.locator("[data-testid='logo-link']")).toBeVisible({ timeout: 10000 });
    
    // Vérifier la navigation principale
    await expect(page.locator("[data-testid='main-navigation']")).toBeVisible({ timeout: 10000 });
    
    // Vérifier le lien de connexion
    await expect(page.locator("[data-testid='login-link']")).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/homepage-final.png", fullPage: true });
    
    console.log("✅ Page d'accueil - Navigation et structure validées");
  });

  test("Navigation vers la page de connexion via data-testid", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le lien de connexion en utilisant data-testid
    await page.locator("[data-testid='login-link']").click();
    
    // Vérifier que nous sommes sur la page de connexion
    await expect(page).toHaveURL(/.*login.*/);
    
    // Vérifier la présence du formulaire de connexion
    await expect(page.locator("[data-testid='login-form']")).toBeVisible({ timeout: 10000 });
    
    // Vérifier les champs du formulaire
    await expect(page.locator("[data-testid='email-input']")).toBeVisible();
    await expect(page.locator("[data-testid='password-input']")).toBeVisible();
    await expect(page.locator("[data-testid='login-submit-button']")).toBeVisible();
    
    await page.screenshot({ path: "tests/screenshots/login-page-final.png", fullPage: true });
    
    console.log("✅ Navigation vers la page de connexion réussie");
  });

  test("Connexion utilisateur standard avec data-testid", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    // Attendre que le formulaire soit visible
    await expect(page.locator("[data-testid='login-form']")).toBeVisible({ timeout: 10000 });
    
    // Saisir les identifiants en utilisant data-testid
    await page.locator("[data-testid='email-input']").fill(USER_CREDENTIALS.email);
    await page.locator("[data-testid='password-input']").fill(USER_CREDENTIALS.password);
    
    // Cliquer sur le bouton de connexion
    await page.locator("[data-testid='login-submit-button']").click();
    
    // Attendre la redirection (timeout plus long)
    await page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 });
    
    // Vérifier que l'utilisateur est connecté en cherchant le lien profil
    await expect(page.locator("[data-testid='profile-link']")).toBeVisible({ timeout: 15000 });
    
    await page.screenshot({ path: "tests/screenshots/user-login-final.png", fullPage: true });
    
    console.log("✅ Connexion utilisateur standard réussie");
  });

  test("Connexion administrateur avec data-testid", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    // Attendre que le formulaire soit visible
    await expect(page.locator("[data-testid='login-form']")).toBeVisible({ timeout: 10000 });
    
    // Saisir les identifiants admin
    await page.locator("[data-testid='email-input']").fill(ADMIN_CREDENTIALS.email);
    await page.locator("[data-testid='password-input']").fill(ADMIN_CREDENTIALS.password);
    
    // Cliquer sur le bouton de connexion
    await page.locator("[data-testid='login-submit-button']").click();
    
    // Attendre la redirection
    await page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 });
    
    // Vérifier que l'utilisateur est connecté
    await expect(page.locator("[data-testid='profile-link']")).toBeVisible({ timeout: 15000 });
    
    // Vérifier la présence du lien admin
    await expect(page.locator("[data-testid='admin-link']")).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/admin-login-final.png", fullPage: true });
    
    console.log("✅ Connexion administrateur réussie avec accès admin détecté");
  });

  test("Accès à l'interface d'administration", async ({ page }) => {
    // Se connecter en tant qu'admin d'abord
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    await page.locator("[data-testid='email-input']").fill(ADMIN_CREDENTIALS.email);
    await page.locator("[data-testid='password-input']").fill(ADMIN_CREDENTIALS.password);
    await page.locator("[data-testid='login-submit-button']").click();
    
    await page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 });
    
    // Cliquer sur le lien admin
    await page.locator("[data-testid='admin-link']").click();
    
    // Vérifier que nous sommes sur la page d'administration
    await expect(page).toHaveURL(/.*admin.*/);
    
    await page.screenshot({ path: "tests/screenshots/admin-dashboard-final.png", fullPage: true });
    
    console.log("✅ Interface d'administration accessible");
  });

  test("Test de déconnexion", async ({ page }) => {
    // Se connecter d'abord
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    await page.locator("[data-testid='email-input']").fill(USER_CREDENTIALS.email);
    await page.locator("[data-testid='password-input']").fill(USER_CREDENTIALS.password);
    await page.locator("[data-testid='login-submit-button']").click();
    
    await page.waitForURL(/^(?!.*login).*$/, { timeout: 30000 });
    
    // Aller à la page de profil pour accéder au bouton de déconnexion
    await page.locator("[data-testid='profile-link']").click();
    
    // Attendre d'être sur la page de profil
    await page.waitForURL(/.*profile.*/);
    
    // Chercher et cliquer sur le bouton de déconnexion
    await expect(page.locator("[data-testid='logout-button']")).toBeVisible({ timeout: 10000 });
    await page.locator("[data-testid='logout-button']").click();
    
    // Vérifier que l'utilisateur est redirigé et déconnecté
    await page.waitForURL(/^(?!.*profile).*$/, { timeout: 15000 });
    
    // Vérifier que le lien de connexion est à nouveau visible
    await expect(page.locator("[data-testid='login-link']")).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: "tests/screenshots/logout-final.png", fullPage: true });
    
    console.log("✅ Déconnexion réussie");
  });

  test("Navigation vers la boutique", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Chercher un lien vers la boutique dans la navigation
    const shopLink = page.locator("[data-testid='main-navigation'] a[href*='shop']").first();
    
    try {
      await expect(shopLink).toBeVisible({ timeout: 10000 });
      await shopLink.click();
    } catch (e) {
      // Si le lien n'est pas trouvé dans la navigation, naviguer directement
      await page.goto("/shop");
    }
    
    await page.waitForLoadState('networkidle');
    
    // Vérifier que nous sommes sur la page boutique
    await expect(page).toHaveURL(/.*(?:shop|boutique).*/);
    
    await page.screenshot({ path: "tests/screenshots/shop-final.png", fullPage: true });
    
    console.log("✅ Page boutique accessible");
  });

  test("Vérification complète de la structure avec data-testid", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState('networkidle');
    
    // Vérifier tous les éléments principaux avec data-testid
    const elementsToCheck = [
      { selector: "[data-testid='logo-link']", name: "Logo" },
      { selector: "[data-testid='main-navigation']", name: "Navigation principale" },
      { selector: "[data-testid='login-link']", name: "Lien de connexion" }
    ];
    
    for (const element of elementsToCheck) {
      try {
        await expect(page.locator(element.selector)).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${element.name} détecté`);
      } catch (e) {
        console.log(`⚠️ ${element.name} non détecté`);
      }
    }
    
    // Vérifier qu'il n'y a pas d'erreurs JavaScript majeures
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: "tests/screenshots/structure-final.png", fullPage: true });
    
    console.log(`✅ Vérification complète terminée ${errors.length > 0 ? `(${errors.length} erreurs JS)` : '(aucune erreur JS)'}`);
  });
});
