import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3105",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "npm run start -- --port 3105",
    url: "http://127.0.0.1:3105/explore",
    reuseExistingServer: false,
    env: {
      CATALOG_MODE: "mock",
      OPENAI_API_KEY: "",
      SHELF_INSPECTOR: "1",
      SHELF_ACCESS: "local",
      DEMO_ACCESS_PASSWORD: "",
      SHELF_PUBLIC_ORIGIN: "",
      NEXT_PUBLIC_SHELF_BRANCHES: "",
    },
  },
});
