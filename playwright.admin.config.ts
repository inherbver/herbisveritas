import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/admin",
  fullyParallel: false, // Tests admin séquentiels pour éviter les conflits
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Un seul worker pour les tests admin
  
  reporter: [
    ['html', { outputFolder: 'playwright-report-admin' }],
    ['list'],
  ],
  
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Timeouts plus généreux pour les tests admin
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  // Un seul navigateur pour simplifier
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  
  // Pas de webServer car le serveur est déjà lancé
  
  // Timeouts globaux
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  
  // Configuration des répertoires de sortie
  outputDir: "test-results-admin/",
});