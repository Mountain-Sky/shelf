import { defineConfig } from "@playwright/test";
/** Read-only UI checks against an already-running, isolated Koha-backed Shelf. */
export default defineConfig({
  testDir: "./tests/koha-browser",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.SHELF_KOHA_TEST_URL || "http://127.0.0.1:3001",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
});
