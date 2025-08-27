import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Désactiver le parallélisme pour éviter les blocages sur Windows
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Forcer un seul worker pour éviter les problèmes de concurrence
  
  // Reporters optimisés pour CI
  reporter: process.env.CI 
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/playwright-results.json' }],
        ['junit', { outputFile: 'test-results/playwright-results.xml' }],
        ['github'],
      ]
    : [
        ['html'],
        ['list'],
      ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off", // Désactiver les vidéos pour améliorer les performances
    // Timeout réduit pour les actions
    actionTimeout: 5000,
    // Timeout réduit pour la navigation
    navigationTimeout: 10000,
    // Options pour Windows
    headless: true,
    launchOptions: {
      // Options spécifiques pour Windows
      slowMo: 100, // Ralentir les actions pour éviter les race conditions
    },
  },
  
  // Configuration des projets pour parallélisation
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit", 
      use: { ...devices["Desktop Safari"] },
    },
    // Tests mobiles
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: "**/mobile-*.spec.ts",
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
      testMatch: "**/mobile-*.spec.ts", 
    },
  ],
  
  // Configuration du serveur pour CI/CD
  webServer: process.env.CI 
    ? undefined // Le serveur est démarré manuellement en CI
    : {
        command: "npm run dev",
        url: "http://localhost:3001",
        reuseExistingServer: true, // Toujours réutiliser le serveur existant
        timeout: 60000, // Réduire le timeout de démarrage
        stdout: "pipe",
        stderr: "pipe",
      },
  
  // Timeouts réduits pour éviter les blocages
  timeout: 30000, // 30 secondes par test
  expect: {
    timeout: 5000, // 5 secondes pour les assertions
  },
  
  // Global timeout pour éviter les tests qui tournent indéfiniment
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : 10 * 60 * 1000, // 10 minutes local, 30 minutes CI
  
  // Configuration des répertoires de sortie
  outputDir: "test-results/",
});
