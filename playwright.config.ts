import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "npm run start -- --port 3100",
    env: { SHELF_INSPECTOR: "1", OPENAI_API_KEY: "", CATALOG_MODE: "mock" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
});
