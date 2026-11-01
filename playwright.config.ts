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
  webServer: [
    {
      command:
        "npm run demo:start -- --port 3100 --catalog-port 4311 --state .local/e2e-catalog.json --reset",
      env: {
        SHELF_INSPECTOR: "1",
        OPENAI_API_KEY: "",
        SHELF_ACCESS: "local",
        DEMO_ACCESS_PASSWORD: "",
        SHELF_PUBLIC_ORIGIN: "",
        SHELF_HOST: "127.0.0.1",
      },
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
    },
    {
      command:
        "npm run demo:start -- --port 3102 --catalog-port 4312 --state .local/e2e-private-catalog.json --reset",
      env: {
        SHELF_INSPECTOR: "0",
        OPENAI_API_KEY: "",
        SHELF_ACCESS: "private",
        DEMO_ACCESS_PASSWORD: "shelf-test-reviewer-password",
        SHELF_PUBLIC_ORIGIN: "",
        SHELF_HOST: "127.0.0.1",
      },
      url: "http://127.0.0.1:3102",
      reuseExistingServer: false,
    },
  ],
});
