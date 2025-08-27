import { test, expect, Page } from "@playwright/test";
import { randomBytes } from "crypto";

// Configuration
const ADMIN_EMAIL = "inherbver@gmail.com";
const ADMIN_PASSWORD = "Admin123!";

// Helper pour générer des données uniques
function generateUniqueId() {
  return randomBytes(4).toString("hex");
}

// Helper pour la connexion admin
async function loginAsAdmin(page: Page) {
  await page.goto("/fr/login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/shop");
}

test.describe("Admin Products - CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/products");
  });

  test("should list all products", async ({ page }) => {
    // Vérifier le titre de la page
    await expect(page.getByText("Gestion des produits")).toBeVisible();
    
    // Vérifier la présence du tableau
    const table = page.locator("table");
    await expect(table).toBeVisible();
    
    // Vérifier les colonnes
    const headers = ["Nom", "Prix", "Stock", "Catégorie", "Statut", "Actions"];
    for (const header of headers) {
      await expect(table.locator("th", { hasText: header })).toBeVisible();
    }
    
    // Vérifier qu'il y a des produits
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("should create a new product", async ({ page }) => {
    const uniqueId = generateUniqueId();
    const productName = `Test Product ${uniqueId}`;
    
    // Cliquer sur le bouton nouveau produit
    await page.click('a[href*="/admin/products/new"]');
    
    // Remplir le formulaire
    await page.fill('input[name="name"]', productName);
    await page.fill('textarea[name="description"]', `Description for ${productName}`);
    await page.fill('input[name="price"]', "29.99");
    await page.fill('input[name="stock"]', "100");
    
    // Sélectionner une catégorie
    await page.click('button[role="combobox"]');
    await page.click('div[role="option"]:first-child');
    
    // Soumettre le formulaire
    await page.click('button[type="submit"]');
    
    // Vérifier la redirection et le message de succès
    await expect(page).toHaveURL(/.*\/admin\/products/);
    await expect(page.getByText(/Produit créé avec succès/i)).toBeVisible();
    
    // Vérifier que le produit apparaît dans la liste
    await expect(page.getByText(productName)).toBeVisible();
  });

  test("should edit an existing product", async ({ page }) => {
    // Cliquer sur le bouton éditer du premier produit
    const editButton = page.locator('button[aria-label*="Modifier"]').first();
    await editButton.click();
    
    // Modifier le prix
    const priceInput = page.locator('input[name="price"]');
    await priceInput.clear();
    await priceInput.fill("39.99");
    
    // Sauvegarder les modifications
    await page.click('button[type="submit"]');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Produit mis à jour/i)).toBeVisible();
    
    // Vérifier que le nouveau prix est affiché
    await expect(page.getByText("39,99 €")).toBeVisible();
  });

  test("should search and filter products", async ({ page }) => {
    // Utiliser la barre de recherche
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    await searchInput.fill("Baume");
    await searchInput.press("Enter");
    
    // Vérifier que seuls les produits correspondants sont affichés
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain("baume");
    }
  });

  test("should handle product stock updates", async ({ page }) => {
    // Trouver un produit avec stock
    const stockCell = page.locator('td[data-label="Stock"]').first();
    const initialStock = await stockCell.textContent();
    
    // Cliquer sur le bouton de mise à jour rapide du stock
    const quickUpdateButton = page.locator('button[aria-label*="Stock"]').first();
    await quickUpdateButton.click();
    
    // Mettre à jour le stock dans le modal
    const stockInput = page.locator('input[name="stock"]');
    await stockInput.clear();
    await stockInput.fill("50");
    
    await page.click('button[type="submit"]');
    
    // Vérifier la mise à jour
    await expect(stockCell).not.toHaveText(initialStock!);
    await expect(stockCell).toContainText("50");
  });

  test("should deactivate a product", async ({ page }) => {
    // Cliquer sur le menu d'actions du premier produit
    const actionsButton = page.locator('button[aria-label*="Actions"]').first();
    await actionsButton.click();
    
    // Sélectionner "Désactiver"
    await page.click('button:has-text("Désactiver")');
    
    // Confirmer dans le dialog
    await page.click('button:has-text("Confirmer")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Produit désactivé/i)).toBeVisible();
    
    // Vérifier le changement de statut
    const statusBadge = page.locator('[data-testid="status-badge"]').first();
    await expect(statusBadge).toContainText("Inactif");
  });

  test("should delete a product", async ({ page }) => {
    // Créer d'abord un produit à supprimer
    const uniqueId = generateUniqueId();
    const productName = `To Delete ${uniqueId}`;
    
    // Créer le produit
    await page.click('a[href*="/admin/products/new"]');
    await page.fill('input[name="name"]', productName);
    await page.fill('textarea[name="description"]', "Product to be deleted");
    await page.fill('input[name="price"]', "10.00");
    await page.fill('input[name="stock"]', "1");
    await page.click('button[type="submit"]');
    
    // Attendre et trouver le produit créé
    await page.waitForURL(/.*\/admin\/products/);
    const productRow = page.locator(`tr:has-text("${productName}")`);
    
    // Ouvrir le menu d'actions
    await productRow.locator('button[aria-label*="Actions"]').click();
    
    // Cliquer sur supprimer
    await page.click('button:has-text("Supprimer")');
    
    // Confirmer la suppression
    await page.click('button:has-text("Supprimer définitivement")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Produit supprimé/i)).toBeVisible();
    
    // Vérifier que le produit n'est plus dans la liste
    await expect(productRow).not.toBeVisible();
  });

  test("should handle bulk operations", async ({ page }) => {
    // Sélectionner plusieurs produits
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await checkboxes.nth(3).check();
    
    // Vérifier que le menu d'actions en masse apparaît
    const bulkActionsMenu = page.locator('[data-testid="bulk-actions"]');
    await expect(bulkActionsMenu).toBeVisible();
    
    // Effectuer une action en masse (ex: export)
    await bulkActionsMenu.locator('button:has-text("Exporter")').click();
    
    // Vérifier le message de confirmation
    await expect(page.getByText(/3 produits sélectionnés/i)).toBeVisible();
  });

  test("should validate product form", async ({ page }) => {
    await page.click('a[href*="/admin/products/new"]');
    
    // Essayer de soumettre un formulaire vide
    await page.click('button[type="submit"]');
    
    // Vérifier les messages d'erreur
    await expect(page.getByText(/Le nom est requis/i)).toBeVisible();
    await expect(page.getByText(/Le prix est requis/i)).toBeVisible();
    await expect(page.getByText(/La description est requise/i)).toBeVisible();
    
    // Tester la validation du prix (valeur négative)
    await page.fill('input[name="price"]', "-10");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Le prix doit être positif/i)).toBeVisible();
    
    // Tester la validation du stock
    await page.fill('input[name="stock"]', "-5");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Le stock ne peut pas être négatif/i)).toBeVisible();
  });

  test("should upload product images", async ({ page }) => {
    await page.click('a[href*="/admin/products/new"]');
    
    // Remplir les champs obligatoires
    const uniqueId = generateUniqueId();
    await page.fill('input[name="name"]', `Product with Image ${uniqueId}`);
    await page.fill('textarea[name="description"]', "Product with image test");
    await page.fill('input[name="price"]', "25.00");
    await page.fill('input[name="stock"]', "10");
    
    // Upload d'image (créer un fichier de test)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-image.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-content"),
    });
    
    // Vérifier l'aperçu de l'image
    await expect(page.locator('img[alt*="preview"]')).toBeVisible();
    
    // Soumettre le formulaire
    await page.click('button[type="submit"]');
    
    // Vérifier le succès
    await expect(page.getByText(/Produit créé avec succès/i)).toBeVisible();
  });
});

test.describe("Admin Products - Pagination & Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/products");
  });

  test("should paginate products", async ({ page }) => {
    // Vérifier la présence de la pagination
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();
    
    // Aller à la page suivante
    const nextButton = pagination.locator('button[aria-label="Page suivante"]');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      
      // Vérifier que l'URL a changé
      await expect(page).toHaveURL(/.*page=2/);
      
      // Vérifier que de nouveaux produits sont affichés
      const firstProductName = await page.locator("tbody tr").first().textContent();
      
      // Retourner à la première page
      await pagination.locator('button[aria-label="Page précédente"]').click();
      
      // Vérifier que le premier produit est différent
      const newFirstProductName = await page.locator("tbody tr").first().textContent();
      expect(firstProductName).not.toBe(newFirstProductName);
    }
  });

  test("should sort products by different columns", async ({ page }) => {
    // Trier par nom
    const nameHeader = page.locator('th:has-text("Nom")');
    await nameHeader.click();
    
    // Vérifier l'icône de tri
    await expect(nameHeader.locator('[data-testid="sort-icon"]')).toBeVisible();
    
    // Récupérer les noms triés
    const names = await page.locator('td[data-label="Nom"]').allTextContents();
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
    
    // Trier par prix
    const priceHeader = page.locator('th:has-text("Prix")');
    await priceHeader.click();
    
    // Vérifier que les prix sont triés
    const prices = await page.locator('td[data-label="Prix"]').allTextContents();
    const numericPrices = prices.map(p => parseFloat(p.replace(/[^\d.,]/g, "").replace(",", ".")));
    const sortedPrices = [...numericPrices].sort((a, b) => a - b);
    expect(numericPrices).toEqual(sortedPrices);
  });
});