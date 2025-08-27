import { test, expect, Page } from "@playwright/test";
import { randomBytes } from "crypto";

// Configuration
const ADMIN_EMAIL = "inherbver@gmail.com";
const ADMIN_PASSWORD = "Admin123!";

// Helper pour générer des données uniques
function generateUniqueEmail() {
  const uniqueId = randomBytes(4).toString("hex");
  return `test.user.${uniqueId}@example.com`;
}

// Helper pour la connexion admin
async function loginAsAdmin(page: Page) {
  await page.goto("/fr/login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/shop");
}

test.describe("Admin Users - CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/users");
  });

  test("should list all users with details", async ({ page }) => {
    // Vérifier le titre de la page
    await expect(page.getByText("Gestion des utilisateurs")).toBeVisible();
    
    // Vérifier les statistiques
    const statsCards = page.locator('[data-testid*="stats-card"]');
    await expect(statsCards).toHaveCount(4); // Total, Actifs, Suspendus, Supprimés
    
    // Vérifier le tableau des utilisateurs
    const table = page.locator("table");
    await expect(table).toBeVisible();
    
    // Vérifier les colonnes
    const headers = ["Email", "Nom", "Rôle", "Statut", "Date d'inscription", "Actions"];
    for (const header of headers) {
      await expect(table.locator("th", { hasText: header })).toBeVisible();
    }
  });

  test("should search and filter users", async ({ page }) => {
    // Recherche par email
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    await searchInput.fill("@gmail.com");
    await searchInput.press("Enter");
    
    // Vérifier que seuls les utilisateurs Gmail sont affichés
    const emails = await page.locator('td[data-label="Email"]').allTextContents();
    emails.forEach(email => {
      expect(email).toContain("@gmail.com");
    });
    
    // Filtrer par rôle
    await page.click('button:has-text("Filtres")');
    await page.click('label:has-text("Admin")');
    await page.click('button:has-text("Appliquer")');
    
    // Vérifier que seuls les admins sont affichés
    const roles = await page.locator('[data-testid="role-badge"]').allTextContents();
    roles.forEach(role => {
      expect(role).toBe("Admin");
    });
  });

  test("should view user details", async ({ page }) => {
    // Cliquer sur le premier utilisateur
    const firstUserRow = page.locator("tbody tr").first();
    const userEmail = await firstUserRow.locator('td[data-label="Email"]').textContent();
    
    await firstUserRow.locator('button[aria-label*="Voir"]').click();
    
    // Vérifier la page de détails
    await expect(page).toHaveURL(/.*\/admin\/users\/[a-f0-9-]+/);
    await expect(page.getByText(userEmail!)).toBeVisible();
    
    // Vérifier les sections de détails
    await expect(page.getByText("Informations personnelles")).toBeVisible();
    await expect(page.getByText("Historique des commandes")).toBeVisible();
    await expect(page.getByText("Activité récente")).toBeVisible();
  });

  test("should update user role", async ({ page }) => {
    // Trouver un utilisateur non-admin
    const userRow = page.locator('tr:has([data-testid="role-badge"]:not(:has-text("Admin")))').first();
    
    // Ouvrir le menu d'actions
    await userRow.locator('button[aria-label*="Actions"]').click();
    
    // Cliquer sur "Modifier le rôle"
    await page.click('button:has-text("Modifier le rôle")');
    
    // Sélectionner le nouveau rôle dans le modal
    await page.click('select[name="role"]');
    await page.selectOption('select[name="role"]', "editor");
    
    // Confirmer le changement
    await page.click('button:has-text("Confirmer")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Rôle mis à jour/i)).toBeVisible();
    
    // Vérifier que le badge de rôle a changé
    await expect(userRow.locator('[data-testid="role-badge"]')).toContainText("Éditeur");
  });

  test("should suspend a user", async ({ page }) => {
    // Trouver un utilisateur actif (non-admin)
    const activeUserRow = page.locator('tr:has([data-testid="status-badge"]:has-text("Actif")):not(:has([data-testid="role-badge"]:has-text("Admin")))').first();
    
    // Ouvrir le menu d'actions
    await activeUserRow.locator('button[aria-label*="Actions"]').click();
    
    // Cliquer sur "Suspendre"
    await page.click('button:has-text("Suspendre")');
    
    // Confirmer dans le dialog
    await page.fill('textarea[name="reason"]', "Violation des conditions d'utilisation");
    await page.click('button:has-text("Suspendre le compte")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Utilisateur suspendu/i)).toBeVisible();
    
    // Vérifier que le statut a changé
    await expect(activeUserRow.locator('[data-testid="status-badge"]')).toContainText("Suspendu");
  });

  test("should reactivate a suspended user", async ({ page }) => {
    // Trouver un utilisateur suspendu
    const suspendedUserRow = page.locator('tr:has([data-testid="status-badge"]:has-text("Suspendu"))').first();
    
    if (await suspendedUserRow.isVisible()) {
      // Ouvrir le menu d'actions
      await suspendedUserRow.locator('button[aria-label*="Actions"]').click();
      
      // Cliquer sur "Réactiver"
      await page.click('button:has-text("Réactiver")');
      
      // Confirmer
      await page.click('button:has-text("Confirmer la réactivation")');
      
      // Vérifier le message de succès
      await expect(page.getByText(/Utilisateur réactivé/i)).toBeVisible();
      
      // Vérifier que le statut a changé
      await expect(suspendedUserRow.locator('[data-testid="status-badge"]')).toContainText("Actif");
    }
  });

  test("should export users list", async ({ page }) => {
    // Cliquer sur le bouton d'export
    await page.click('button:has-text("Exporter")');
    
    // Sélectionner le format
    await page.click('label:has-text("CSV")');
    
    // Sélectionner les champs à exporter
    await page.click('input[name="export_email"]');
    await page.click('input[name="export_name"]');
    await page.click('input[name="export_role"]');
    
    // Lancer l'export
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Télécharger")');
    const download = await downloadPromise;
    
    // Vérifier le nom du fichier
    expect(download.suggestedFilename()).toContain("users");
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("should handle user permissions", async ({ page }) => {
    // Cliquer sur un utilisateur pour voir ses détails
    const userRow = page.locator("tbody tr").first();
    await userRow.locator('button[aria-label*="Voir"]').click();
    
    // Aller à l'onglet Permissions
    await page.click('button[role="tab"]:has-text("Permissions")');
    
    // Vérifier les permissions actuelles
    await expect(page.getByText("Permissions actuelles")).toBeVisible();
    
    // Modifier une permission
    const permissionToggle = page.locator('input[type="checkbox"][name*="permission"]').first();
    const wasChecked = await permissionToggle.isChecked();
    await permissionToggle.click();
    
    // Sauvegarder
    await page.click('button:has-text("Sauvegarder les permissions")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Permissions mises à jour/i)).toBeVisible();
    
    // Vérifier que la permission a bien changé
    expect(await permissionToggle.isChecked()).toBe(!wasChecked);
  });

  test("should send email to user", async ({ page }) => {
    // Ouvrir le menu d'actions d'un utilisateur
    const userRow = page.locator("tbody tr").first();
    await userRow.locator('button[aria-label*="Actions"]').click();
    
    // Cliquer sur "Envoyer un email"
    await page.click('button:has-text("Envoyer un email")');
    
    // Remplir le formulaire d'email
    await page.fill('input[name="subject"]', "Message de test");
    await page.fill('textarea[name="message"]', "Ceci est un message de test depuis le dashboard admin.");
    
    // Envoyer
    await page.click('button:has-text("Envoyer")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Email envoyé avec succès/i)).toBeVisible();
  });

  test("should view user activity log", async ({ page }) => {
    // Cliquer sur un utilisateur
    const userRow = page.locator("tbody tr").first();
    await userRow.locator('button[aria-label*="Voir"]').click();
    
    // Aller à l'onglet Activité
    await page.click('button[role="tab"]:has-text("Activité")');
    
    // Vérifier l'affichage du journal d'activité
    await expect(page.getByText("Journal d'activité")).toBeVisible();
    
    // Vérifier qu'il y a des entrées
    const activityEntries = page.locator('[data-testid="activity-entry"]');
    await expect(activityEntries.first()).toBeVisible();
    
    // Vérifier les détails d'une entrée
    const firstEntry = activityEntries.first();
    await expect(firstEntry.locator('[data-testid="activity-date"]')).toBeVisible();
    await expect(firstEntry.locator('[data-testid="activity-action"]')).toBeVisible();
  });

  test("should handle bulk user operations", async ({ page }) => {
    // Sélectionner plusieurs utilisateurs
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    
    // Vérifier que le menu d'actions en masse apparaît
    const bulkActionsMenu = page.locator('[data-testid="bulk-actions"]');
    await expect(bulkActionsMenu).toBeVisible();
    await expect(bulkActionsMenu).toContainText("3 utilisateurs sélectionnés");
    
    // Effectuer une action en masse (ex: envoyer un email)
    await bulkActionsMenu.locator('button:has-text("Envoyer un email")').click();
    
    // Remplir le formulaire
    await page.fill('input[name="subject"]', "Notification importante");
    await page.fill('textarea[name="message"]', "Message envoyé à plusieurs utilisateurs.");
    
    // Envoyer
    await page.click('button:has-text("Envoyer à 3 utilisateurs")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Emails envoyés à 3 utilisateurs/i)).toBeVisible();
  });
});

test.describe("Admin Users - Advanced Features", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/users");
  });

  test("should generate user report", async ({ page }) => {
    // Ouvrir le menu des rapports
    await page.click('button:has-text("Rapports")');
    
    // Sélectionner le type de rapport
    await page.click('label:has-text("Rapport d\'activité")');
    
    // Sélectionner la période
    await page.fill('input[name="date_from"]', "2024-01-01");
    await page.fill('input[name="date_to"]', "2024-12-31");
    
    // Générer le rapport
    await page.click('button:has-text("Générer le rapport")');
    
    // Attendre le chargement
    await expect(page.getByText(/Rapport généré/i)).toBeVisible();
    
    // Vérifier l'affichage du rapport
    const reportModal = page.locator('[data-testid="report-modal"]');
    await expect(reportModal).toBeVisible();
    await expect(reportModal.locator('h2')).toContainText("Rapport d'activité");
  });

  test("should import users from CSV", async ({ page }) => {
    // Cliquer sur le bouton d'import
    await page.click('button:has-text("Importer")');
    
    // Créer un fichier CSV de test
    const csvContent = `email,nom,prenom,role
test1@example.com,Dupont,Jean,user
test2@example.com,Martin,Marie,editor`;
    
    // Upload le fichier
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: "users.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });
    
    // Vérifier l'aperçu
    await expect(page.getByText("2 utilisateurs à importer")).toBeVisible();
    
    // Confirmer l'import
    await page.click('button:has-text("Confirmer l\'import")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/2 utilisateurs importés avec succès/i)).toBeVisible();
  });
});