import { test, expect, Page } from "@playwright/test";

// Configuration
const ADMIN_EMAIL = "inherbver@gmail.com";
const ADMIN_PASSWORD = "Admin123!";

// Helper pour la connexion admin
async function loginAsAdmin(page: Page) {
  await page.goto("/fr/login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/shop");
}

test.describe("Admin Orders - Management Operations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/orders");
  });

  test("should display orders dashboard with statistics", async ({ page }) => {
    // Vérifier le titre
    await expect(page.getByText("Gestion des commandes")).toBeVisible();
    
    // Vérifier les cartes de statistiques
    const statsCards = [
      "Total des commandes",
      "En attente",
      "En cours de traitement",
      "Expédiées",
      "Livrées",
      "Annulées"
    ];
    
    for (const stat of statsCards) {
      await expect(page.getByText(stat)).toBeVisible();
    }
    
    // Vérifier le graphique des commandes
    await expect(page.locator('[data-testid="orders-chart"]')).toBeVisible();
  });

  test("should list all orders with details", async ({ page }) => {
    // Vérifier le tableau des commandes
    const table = page.locator("table");
    await expect(table).toBeVisible();
    
    // Vérifier les colonnes
    const headers = [
      "N° Commande",
      "Client",
      "Date",
      "Montant",
      "Statut",
      "Paiement",
      "Actions"
    ];
    
    for (const header of headers) {
      await expect(table.locator("th", { hasText: header })).toBeVisible();
    }
    
    // Vérifier qu'il y a des commandes
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("should view order details", async ({ page }) => {
    // Cliquer sur la première commande
    const firstOrderRow = page.locator("tbody tr").first();
    const orderNumber = await firstOrderRow.locator('td[data-label="N° Commande"]').textContent();
    
    await firstOrderRow.locator('button[aria-label*="Voir"]').click();
    
    // Vérifier la page de détails
    await expect(page).toHaveURL(/.*\/admin\/orders\/[a-f0-9-]+/);
    await expect(page.getByText(`Commande ${orderNumber}`)).toBeVisible();
    
    // Vérifier les sections de détails
    const sections = [
      "Informations client",
      "Articles commandés",
      "Adresse de livraison",
      "Historique de la commande",
      "Informations de paiement"
    ];
    
    for (const section of sections) {
      await expect(page.getByText(section)).toBeVisible();
    }
  });

  test("should update order status", async ({ page }) => {
    // Trouver une commande en attente
    const pendingOrder = page.locator('tr:has([data-testid="status-badge"]:has-text("En attente"))').first();
    
    if (await pendingOrder.isVisible()) {
      // Ouvrir le menu d'actions
      await pendingOrder.locator('button[aria-label*="Actions"]').click();
      
      // Cliquer sur "Modifier le statut"
      await page.click('button:has-text("Modifier le statut")');
      
      // Sélectionner le nouveau statut
      await page.selectOption('select[name="status"]', "processing");
      
      // Ajouter une note
      await page.fill('textarea[name="note"]', "Commande en cours de préparation");
      
      // Confirmer
      await page.click('button:has-text("Mettre à jour")');
      
      // Vérifier le message de succès
      await expect(page.getByText(/Statut mis à jour/i)).toBeVisible();
      
      // Vérifier que le statut a changé
      await expect(pendingOrder.locator('[data-testid="status-badge"]')).toContainText("En cours");
    }
  });

  test("should process refund", async ({ page }) => {
    // Trouver une commande livrée
    const deliveredOrder = page.locator('tr:has([data-testid="status-badge"]:has-text("Livrée"))').first();
    
    if (await deliveredOrder.isVisible()) {
      // Ouvrir les détails de la commande
      await deliveredOrder.locator('button[aria-label*="Voir"]').click();
      
      // Cliquer sur le bouton de remboursement
      await page.click('button:has-text("Effectuer un remboursement")');
      
      // Remplir le formulaire de remboursement
      await page.fill('input[name="amount"]', "10.00");
      await page.fill('textarea[name="reason"]', "Article endommagé");
      
      // Sélectionner le type de remboursement
      await page.click('label:has-text("Remboursement partiel")');
      
      // Confirmer
      await page.click('button:has-text("Confirmer le remboursement")');
      
      // Vérifier le message de succès
      await expect(page.getByText(/Remboursement effectué/i)).toBeVisible();
      
      // Vérifier l'historique
      await expect(page.getByText("Remboursement partiel: 10,00 €")).toBeVisible();
    }
  });

  test("should generate shipping label", async ({ page }) => {
    // Trouver une commande prête à expédier
    const readyOrder = page.locator('tr:has([data-testid="status-badge"]:has-text("En cours"))').first();
    
    if (await readyOrder.isVisible()) {
      // Ouvrir les détails
      await readyOrder.locator('button[aria-label*="Voir"]').click();
      
      // Cliquer sur générer l'étiquette d'expédition
      await page.click('button:has-text("Générer étiquette d\'expédition")');
      
      // Sélectionner le transporteur
      await page.selectOption('select[name="carrier"]', "colissimo");
      
      // Entrer le poids
      await page.fill('input[name="weight"]', "0.5");
      
      // Générer
      const downloadPromise = page.waitForEvent("download");
      await page.click('button:has-text("Télécharger l\'étiquette")');
      const download = await downloadPromise;
      
      // Vérifier le téléchargement
      expect(download.suggestedFilename()).toContain("shipping-label");
      expect(download.suggestedFilename()).toContain(".pdf");
    }
  });

  test("should send order confirmation email", async ({ page }) => {
    // Ouvrir une commande
    const orderRow = page.locator("tbody tr").first();
    await orderRow.locator('button[aria-label*="Voir"]').click();
    
    // Cliquer sur envoyer email
    await page.click('button:has-text("Envoyer un email")');
    
    // Sélectionner le template
    await page.selectOption('select[name="template"]', "order_confirmation");
    
    // Prévisualiser
    await page.click('button:has-text("Prévisualiser")');
    await expect(page.locator('[data-testid="email-preview"]')).toBeVisible();
    
    // Envoyer
    await page.click('button:has-text("Envoyer l\'email")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/Email envoyé avec succès/i)).toBeVisible();
  });

  test("should filter orders by status", async ({ page }) => {
    // Ouvrir les filtres
    await page.click('button:has-text("Filtres")');
    
    // Filtrer par statut "En attente"
    await page.click('label:has-text("En attente")');
    await page.click('button:has-text("Appliquer les filtres")');
    
    // Vérifier que seules les commandes en attente sont affichées
    const statusBadges = await page.locator('[data-testid="status-badge"]').allTextContents();
    statusBadges.forEach(status => {
      expect(status).toBe("En attente");
    });
  });

  test("should filter orders by date range", async ({ page }) => {
    // Ouvrir les filtres
    await page.click('button:has-text("Filtres")');
    
    // Définir la période
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    await page.fill('input[name="date_from"]', lastWeek.toISOString().split('T')[0]);
    await page.fill('input[name="date_to"]', today.toISOString().split('T')[0]);
    
    // Appliquer
    await page.click('button:has-text("Appliquer les filtres")');
    
    // Vérifier que des commandes sont affichées
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("should export orders", async ({ page }) => {
    // Cliquer sur le bouton d'export
    await page.click('button:has-text("Exporter")');
    
    // Sélectionner le format
    await page.click('label:has-text("Excel")');
    
    // Sélectionner la période
    await page.click('label:has-text("Ce mois")');
    
    // Sélectionner les champs
    await page.click('input[name="export_order_number"]');
    await page.click('input[name="export_customer"]');
    await page.click('input[name="export_amount"]');
    await page.click('input[name="export_status"]');
    
    // Télécharger
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Télécharger")');
    const download = await downloadPromise;
    
    // Vérifier le fichier
    expect(download.suggestedFilename()).toContain("orders");
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
  });

  test("should print invoice", async ({ page }) => {
    // Ouvrir une commande payée
    const paidOrder = page.locator('tr:has([data-testid="payment-status"]:has-text("Payé"))').first();
    
    if (await paidOrder.isVisible()) {
      await paidOrder.locator('button[aria-label*="Voir"]').click();
      
      // Cliquer sur imprimer la facture
      await page.click('button:has-text("Imprimer la facture")');
      
      // Vérifier l'aperçu avant impression
      await expect(page.locator('[data-testid="invoice-preview"]')).toBeVisible();
      
      // Vérifier les éléments de la facture
      await expect(page.getByText("FACTURE")).toBeVisible();
      await expect(page.getByText("In Herbis Veritas")).toBeVisible();
      await expect(page.getByText("Total TTC")).toBeVisible();
    }
  });

  test("should handle bulk order operations", async ({ page }) => {
    // Sélectionner plusieurs commandes
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    
    // Vérifier le menu d'actions en masse
    const bulkMenu = page.locator('[data-testid="bulk-actions"]');
    await expect(bulkMenu).toBeVisible();
    await expect(bulkMenu).toContainText("3 commandes sélectionnées");
    
    // Changer le statut en masse
    await bulkMenu.locator('button:has-text("Changer le statut")').click();
    await page.selectOption('select[name="bulk_status"]', "shipped");
    await page.click('button:has-text("Appliquer à 3 commandes")');
    
    // Vérifier le message de succès
    await expect(page.getByText(/3 commandes mises à jour/i)).toBeVisible();
  });

  test("should add internal notes to order", async ({ page }) => {
    // Ouvrir une commande
    const orderRow = page.locator("tbody tr").first();
    await orderRow.locator('button[aria-label*="Voir"]').click();
    
    // Ajouter une note interne
    await page.click('button:has-text("Ajouter une note")');
    await page.fill('textarea[name="internal_note"]', "Client fidèle - Traiter en priorité");
    await page.click('button:has-text("Sauvegarder la note")');
    
    // Vérifier l'affichage de la note
    await expect(page.getByText("Client fidèle - Traiter en priorité")).toBeVisible();
    
    // Vérifier l'horodatage
    const noteTimestamp = page.locator('[data-testid="note-timestamp"]').first();
    await expect(noteTimestamp).toBeVisible();
  });

  test("should track order timeline", async ({ page }) => {
    // Ouvrir une commande
    const orderRow = page.locator("tbody tr").first();
    await orderRow.locator('button[aria-label*="Voir"]').click();
    
    // Vérifier la timeline
    await expect(page.getByText("Historique de la commande")).toBeVisible();
    
    const timeline = page.locator('[data-testid="order-timeline"]');
    await expect(timeline).toBeVisible();
    
    // Vérifier les événements
    const events = timeline.locator('[data-testid="timeline-event"]');
    await expect(events.first()).toBeVisible();
    
    // Chaque événement doit avoir une date et une description
    const firstEvent = events.first();
    await expect(firstEvent.locator('[data-testid="event-date"]')).toBeVisible();
    await expect(firstEvent.locator('[data-testid="event-description"]')).toBeVisible();
  });
});

test.describe("Admin Orders - Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/fr/admin/orders");
  });

  test("should display revenue analytics", async ({ page }) => {
    // Cliquer sur l'onglet Analytics
    await page.click('button[role="tab"]:has-text("Analytics")');
    
    // Vérifier les métriques
    await expect(page.getByText("Chiffre d'affaires")).toBeVisible();
    await expect(page.getByText("Panier moyen")).toBeVisible();
    await expect(page.getByText("Taux de conversion")).toBeVisible();
    
    // Vérifier le graphique des revenus
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test("should generate sales report", async ({ page }) => {
    // Ouvrir les rapports
    await page.click('button:has-text("Rapports")');
    
    // Sélectionner le rapport de ventes
    await page.click('label:has-text("Rapport de ventes")');
    
    // Définir la période
    await page.selectOption('select[name="period"]', "last_month");
    
    // Générer
    await page.click('button:has-text("Générer le rapport")');
    
    // Attendre le rapport
    await expect(page.getByText(/Rapport généré/i)).toBeVisible();
    
    // Vérifier le contenu du rapport
    const reportModal = page.locator('[data-testid="report-modal"]');
    await expect(reportModal).toBeVisible();
    await expect(reportModal).toContainText("Rapport de ventes");
    await expect(reportModal).toContainText("Total des ventes");
    await expect(reportModal).toContainText("Nombre de commandes");
  });
});