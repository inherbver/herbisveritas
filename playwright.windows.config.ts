import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration optimisée pour Windows
 * Utilise des timeouts courts et désactive les features problématiques
 */
export default defineConfig({
  testDir: "./tests/e2e",
  
  // Configuration pour éviter les blocages
  fullyParallel: false,
  workers: 1,
  retries: 0,
  
  // Reporter simplifié
  reporter: [['list']],
  
  use: {
    // URL de base
    baseURL: "http://localhost:3001",
    
    // Timeouts courts pour éviter les blocages
    actionTimeout: 3000,
    navigationTimeout: 5000,
    
    // Options optimisées pour Windows
    headless: true,
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    
    // Launch options pour Windows
    launchOptions: {
      slowMo: 50,
      args: [
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    },
  },
  
  // Un seul projet pour simplifier
  projects: [
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        // Viewport fixe
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  
  // Timeouts globaux courts
  timeout: 15000,
  globalTimeout: 5 * 60 * 1000, // 5 minutes max
  
  expect: {
    timeout: 3000,
  },
  
  // Pas de webServer, on assume qu'il est déjà lancé
  webServer: undefined,
  
  // Output
  outputDir: "test-results-windows/",
});