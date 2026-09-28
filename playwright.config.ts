import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/lab-03/global-setup.ts",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
    headless: true,
  },

  webServer: {
    command: "npm run dev -- --host localhost",
    cwd: "./client",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});