const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  reporter: [
    ["list"],
    ["html", { open: "never", noCopyPrompt: true }],
    ["junit", { outputFile: "test-results/playwright.xml" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/seed.cjs && npm --prefix backend start",
      url: "http://127.0.0.1:3001",
      env: {
        PORT: "3001",
        MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27019/clothify_e2e",
        JWT_SECRET: "local-playwright-test-secret",
      },
      timeout: 60000,
    },
    {
      command: "npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      timeout: 60000,
    },
  ],
});
