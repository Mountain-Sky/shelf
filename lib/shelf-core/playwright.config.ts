import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "discovery.spec.ts",
  workers: 1,
  outputDir: "../../generated-artifacts/playwright",
  reporter: "list",
  use: {
    baseURL: "http://localhost:80",
    browserName: "chromium",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/repl/tools/bin/chromium" },
  },
});
