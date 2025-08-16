import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3003",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    // Timeout global pour les actions
    actionTimeout: 10000,
    // Timeout pour la navigation
    navigationTimeout: 30000,
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
        url: "http://localhost:3003",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  
  // Timeouts globaux
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  // Configuration des répertoires de sortie
  outputDir: "test-results/",
});
