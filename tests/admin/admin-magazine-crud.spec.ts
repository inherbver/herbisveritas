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

test.describe("Admin Magazine - CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/magazine");
  });

  test("should list all magazine articles", async ({ page }) => {
    // Vérifier le titre de la page
    await expect(page.getByText("Gestion du magazine")).toBeVisible();
    
    // Vérifier la présence du bouton de création
    await expect(page.getByRole("link", { name: /Nouvel article/i })).toBeVisible();
    
    // Vérifier le tableau des articles
    const table = page.locator("table");
    await expect(table).toBeVisible();
    
    // Vérifier les colonnes
    const headers = ["Titre", "Auteur", "Catégorie", "Date", "Statut", "Vues", "Actions"];
    for (const header of headers) {
      await expect(table.locator("th", { hasText: header })).toBeVisible();
    }
  });

  test("should create a new article", async ({ page }) => {
    const uniqueId = generateUniqueId();
    const articleTitle = `Les bienfaits du thym ${uniqueId}`;
    
    // Cliquer sur nouveau article
    await page.click('a[href*="/admin/magazine/new"]');
    
    // Remplir le formulaire
    await page.fill('input[name="title"]', articleTitle);
    await page.fill('input[name="slug"]', `bienfaits-thym-${uniqueId}`);
    await page.fill('textarea[name="excerpt"]', "Découvrez les propriétés médicinales du thym.");
    
    // Sélectionner la catégorie
    await page.selectOption('select[name="category"]', "plantes-medicinales");
    
    // Remplir le contenu avec l'éditeur
    const editor = page.locator('[data-testid="content-editor"]');
    await editor.click();
    await page.keyboard.type(`
# Introduction
Le thym est une plante aromatique aux nombreuses vertus.

## Propriétés médicinales
- Antiseptique naturel
- Anti-inflammatoire
- Expectorant

## Utilisations
Le thym peut être utilisé en tisane, en huile essentielle ou en cuisine.
    `);
    
    // Ajouter des tags
    await page.fill('input[name="tags"]', "thym, plantes médicinales, aromathérapie");
    
    // Upload d'une image de couverture
    const fileInput = page.locator('input[type="file"][name="featured_image"]');
    await fileInput.setInputFiles({
      name: "thym.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-content"),
    });
    
    // Publier l'article
    await page.click('button:has-text("Publier")');
    
    // Vérifier la redirection et le message de succès
    await expect(page).toHaveURL(/.*\/admin\/magazine/);
    await expect(page.getByText(/Article publié avec succès/i)).toBeVisible();
    
    // Vérifier que l'article apparaît dans la liste
    await expect(page.getByText(articleTitle)).toBeVisible();
  });

  test("should edit an existing article", async ({ page }) => {
    // Cliquer sur éditer pour le premier article
    const editButton = page.locator('button[aria-label*="Modifier"]').first();
    await editButton.click();
    
    // Modifier le titre
    const titleInput = page.locator('input[name="title"]');
    const originalTitle = await titleInput.inputValue();
    await titleInput.clear();
    await titleInput.fill(`${originalTitle} (Mis à jour)`);
    
    // Ajouter du contenu
    const editor = page.locator('[data-testid="content-editor"]');
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type("\n\n## Mise à jour\nContenu ajouté lors de la mise à jour.");
    
    // Sauvegarder
    await page.click('button:has-text("Mettre à jour")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Article mis à jour/i)).toBeVisible();
  });

  test("should preview article before publishing", async ({ page }) => {
    // Ouvrir un article en édition
    const editButton = page.locator('button[aria-label*="Modifier"]').first();
    await editButton.click();
    
    // Cliquer sur prévisualiser
    await page.click('button:has-text("Prévisualiser")');
    
    // Vérifier l'ouverture du modal de prévisualisation
    const previewModal = page.locator('[data-testid="preview-modal"]');
    await expect(previewModal).toBeVisible();
    
    // Vérifier le rendu du contenu
    await expect(previewModal.locator("h1")).toBeVisible();
    await expect(previewModal.locator("article")).toBeVisible();
    
    // Fermer la prévisualisation
    await page.click('button[aria-label="Fermer la prévisualisation"]');
  });

  test("should manage article status", async ({ page }) => {
    // Trouver un article publié
    const publishedArticle = page.locator('tr:has([data-testid="status-badge"]:has-text("Publié"))').first();
    
    if (await publishedArticle.isVisible()) {
      // Ouvrir le menu d'actions
      await publishedArticle.locator('button[aria-label*="Actions"]').click();
      
      // Mettre en brouillon
      await page.click('button:has-text("Mettre en brouillon")');
      
      // Confirmer
      await page.click('button:has-text("Confirmer")');
      
      // Vérifier le changement de statut
      await expect(publishedArticle.locator('[data-testid="status-badge"]')).toContainText("Brouillon");
      
      // Re-publier
      await publishedArticle.locator('button[aria-label*="Actions"]').click();
      await page.click('button:has-text("Publier")');
      await page.click('button:has-text("Confirmer")');
      
      // Vérifier le retour au statut publié
      await expect(publishedArticle.locator('[data-testid="status-badge"]')).toContainText("Publié");
    }
  });

  test("should schedule article publication", async ({ page }) => {
    await page.click('a[href*="/admin/magazine/new"]');
    
    const uniqueId = generateUniqueId();
    
    // Remplir les champs de base
    await page.fill('input[name="title"]', `Article programmé ${uniqueId}`);
    await page.fill('input[name="slug"]', `article-programme-${uniqueId}`);
    await page.fill('textarea[name="excerpt"]', "Cet article sera publié automatiquement.");
    
    // Programmer la publication
    await page.click('button:has-text("Programmer")');
    
    // Sélectionner une date future
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await page.fill('input[name="publish_date"]', tomorrow.toISOString().split('T')[0]);
    await page.fill('input[name="publish_time"]', "10:00");
    
    // Sauvegarder
    await page.click('button:has-text("Programmer la publication")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Publication programmée/i)).toBeVisible();
    
    // Vérifier le statut
    await expect(page.getByText("Programmé")).toBeVisible();
  });

  test("should delete an article", async ({ page }) => {
    // Créer un article à supprimer
    const uniqueId = generateUniqueId();
    const articleTitle = `À supprimer ${uniqueId}`;
    
    await page.click('a[href*="/admin/magazine/new"]');
    await page.fill('input[name="title"]', articleTitle);
    await page.fill('input[name="slug"]', `a-supprimer-${uniqueId}`);
    await page.fill('textarea[name="excerpt"]', "Article à supprimer");
    await page.click('button:has-text("Sauvegarder comme brouillon")');
    
    // Attendre et trouver l'article créé
    await page.waitForURL(/.*\/admin\/magazine/);
    const articleRow = page.locator(`tr:has-text("${articleTitle}")`);
    
    // Supprimer l'article
    await articleRow.locator('button[aria-label*="Actions"]').click();
    await page.click('button:has-text("Supprimer")');
    
    // Confirmer la suppression
    await page.click('button:has-text("Supprimer définitivement")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Article supprimé/i)).toBeVisible();
    
    // Vérifier que l'article n'est plus dans la liste
    await expect(articleRow).not.toBeVisible();
  });

  test("should manage article categories", async ({ page }) => {
    // Aller à la gestion des catégories
    await page.click('button:has-text("Gérer les catégories")');
    
    // Ajouter une nouvelle catégorie
    await page.click('button:has-text("Nouvelle catégorie")');
    
    const uniqueId = generateUniqueId();
    await page.fill('input[name="category_name"]', `Catégorie test ${uniqueId}`);
    await page.fill('input[name="category_slug"]', `categorie-test-${uniqueId}`);
    await page.fill('textarea[name="category_description"]', "Description de la catégorie test");
    
    await page.click('button:has-text("Créer la catégorie")');
    
    // Vérifier la création
    await expect(page.getByText(`Catégorie test ${uniqueId}`)).toBeVisible();
    
    // Modifier la catégorie
    const categoryRow = page.locator(`tr:has-text("Catégorie test ${uniqueId}")`);
    await categoryRow.locator('button[aria-label*="Modifier"]').click();
    
    await page.fill('textarea[name="category_description"]', "Description modifiée");
    await page.click('button:has-text("Sauvegarder")');
    
    // Vérifier la modification
    await expect(page.getByText("Description modifiée")).toBeVisible();
  });

  test("should manage article comments", async ({ page }) => {
    // Ouvrir un article avec des commentaires
    const articleWithComments = page.locator('tr:has([data-testid="comments-count"]:not(:has-text("0")))').first();
    
    if (await articleWithComments.isVisible()) {
      await articleWithComments.locator('button[aria-label*="Voir"]').click();
      
      // Aller à l'onglet commentaires
      await page.click('button[role="tab"]:has-text("Commentaires")');
      
      // Vérifier la liste des commentaires
      const comments = page.locator('[data-testid="comment-item"]');
      await expect(comments.first()).toBeVisible();
      
      // Modérer un commentaire
      const firstComment = comments.first();
      await firstComment.locator('button:has-text("Approuver")').click();
      
      // Vérifier le changement de statut
      await expect(firstComment.locator('[data-testid="comment-status"]')).toContainText("Approuvé");
      
      // Répondre à un commentaire
      await firstComment.locator('button:has-text("Répondre")').click();
      await page.fill('textarea[name="reply"]', "Merci pour votre commentaire !");
      await page.click('button:has-text("Envoyer la réponse")');
      
      // Vérifier l'affichage de la réponse
      await expect(page.getByText("Merci pour votre commentaire !")).toBeVisible();
    }
  });

  test("should search and filter articles", async ({ page }) => {
    // Recherche par titre
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    await searchInput.fill("plantes");
    await searchInput.press("Enter");
    
    // Vérifier les résultats
    const titles = await page.locator('td[data-label="Titre"]').allTextContents();
    titles.forEach(title => {
      expect(title.toLowerCase()).toContain("plante");
    });
    
    // Filtrer par catégorie
    await page.click('button:has-text("Filtres")');
    await page.selectOption('select[name="category"]', "plantes-medicinales");
    await page.click('button:has-text("Appliquer")');
    
    // Vérifier que seuls les articles de la catégorie sont affichés
    const categories = await page.locator('td[data-label="Catégorie"]').allTextContents();
    categories.forEach(cat => {
      expect(cat).toContain("Plantes médicinales");
    });
  });

  test("should manage article SEO settings", async ({ page }) => {
    // Ouvrir un article en édition
    const editButton = page.locator('button[aria-label*="Modifier"]').first();
    await editButton.click();
    
    // Aller à l'onglet SEO
    await page.click('button[role="tab"]:has-text("SEO")');
    
    // Remplir les métadonnées SEO
    await page.fill('input[name="meta_title"]', "Titre SEO optimisé pour les moteurs de recherche");
    await page.fill('textarea[name="meta_description"]', "Description SEO détaillée pour améliorer le référencement.");
    await page.fill('input[name="focus_keyword"]', "plantes médicinales");
    
    // Vérifier l'aperçu Google
    await expect(page.locator('[data-testid="seo-preview"]')).toBeVisible();
    await expect(page.getByText("Titre SEO optimisé")).toBeVisible();
    
    // Analyser le SEO
    await page.click('button:has-text("Analyser le SEO")');
    
    // Vérifier les recommandations
    await expect(page.locator('[data-testid="seo-score"]')).toBeVisible();
    await expect(page.getByText(/Score SEO/i)).toBeVisible();
    
    // Sauvegarder
    await page.click('button:has-text("Sauvegarder le SEO")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Paramètres SEO mis à jour/i)).toBeVisible();
  });

  test("should export articles", async ({ page }) => {
    // Cliquer sur exporter
    await page.click('button:has-text("Exporter")');
    
    // Sélectionner le format
    await page.click('label:has-text("Markdown")');
    
    // Sélectionner les articles à exporter
    await page.click('label:has-text("Tous les articles")');
    
    // Lancer l'export
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Télécharger")');
    const download = await downloadPromise;
    
    // Vérifier le fichier
    expect(download.suggestedFilename()).toContain("magazine-articles");
    expect(download.suggestedFilename()).toMatch(/\.(zip|md)$/);
  });

  test("should view article analytics", async ({ page }) => {
    // Ouvrir un article publié
    const publishedArticle = page.locator('tr:has([data-testid="status-badge"]:has-text("Publié"))').first();
    await publishedArticle.locator('button[aria-label*="Voir"]').click();
    
    // Aller à l'onglet Analytics
    await page.click('button[role="tab"]:has-text("Analytics")');
    
    // Vérifier les métriques
    await expect(page.getByText("Vues totales")).toBeVisible();
    await expect(page.getByText("Temps de lecture moyen")).toBeVisible();
    await expect(page.getByText("Taux de rebond")).toBeVisible();
    await expect(page.getByText("Partages sociaux")).toBeVisible();
    
    // Vérifier le graphique des vues
    await expect(page.locator('[data-testid="views-chart"]')).toBeVisible();
    
    // Vérifier les sources de trafic
    await expect(page.getByText("Sources de trafic")).toBeVisible();
    await expect(page.locator('[data-testid="traffic-sources"]')).toBeVisible();
  });
});