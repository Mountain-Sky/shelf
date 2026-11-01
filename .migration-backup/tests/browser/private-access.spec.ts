import { test, expect } from "@playwright/test";
// This credential is only for the local automated test server, never production.
const password = "shelf-test-reviewer-password";
test("private production app protects page and API; an authenticated reviewer can discover", async ({
  playwright,
  browser,
}) => {
  const denied = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3102",
  });
  expect((await denied.get("/")).status()).toBe(401);
  expect(
    (
      await denied.post("/api/chat", { data: { message: "The Hobbit" } })
    ).status(),
  ).toBe(401);
  await denied.dispose();
  const context = await browser.newContext({
    httpCredentials: { username: "reviewer", password },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3102");
  await expect(page.locator("article.book").first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "Describe a book" })
    .fill("The Hobbit");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "The Hobbit", exact: true }),
  ).toBeVisible();
  const result = await context.request.post("http://127.0.0.1:3102/api/chat", {
    data: { message: "The Hobbit" },
  });
  expect(result.ok()).toBe(true);
  expect(await result.json()).not.toHaveProperty("trace");
  await context.close();
});
