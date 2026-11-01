import { test, expect } from "@playwright/test";
test("search, refine, inspect, select branch and manage a temporary reading list", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Describe a book" })
    .fill("Project Hail Mary");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator("article").first()).toContainText(
    "Project Hail Mary",
  );
  await page.getByLabel("Look at").selectOption("RUST");
  await expect(page.locator("article").first()).toContainText(
    "RUST: 0 demo copies",
  );
  await page.getByRole("button", { name: "Show Discovery Engine" }).click();
  await expect(
    page.getByRole("heading", { name: "Retrieved candidates" }),
  ).toBeVisible();
  await expect(page.locator(".labPanel")).toContainText("disabled");
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: "Save for later" })
    .click();
  await expect(page.locator(".savedArea")).toContainText("Project Hail Mary");
  await page.getByRole("button", { name: "Copy reading list" }).click();
  await expect(page.locator('.savedArea [role="status"]')).not.toBeEmpty();
  await page.getByRole("button", { name: "Clear temporary list" }).click();
  await expect(page.locator(".savedArea")).toHaveCount(0);
  await page.getByRole("button", { name: "Only mysteries" }).click();
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.locator(".labPanel")).toContainText("mystery");
  await page.getByRole("textbox", { name: "Describe a book" }).fill("zzzxxyy");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("No matching demo titles yet. Try a broader search."),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0);
});
test("mobile layout fits and session list clears on reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "An adventure for kids" }).click();
  await expect(page.locator("article").first()).toBeVisible();
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: "Save for later" })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator(".savedArea")).toHaveCount(0);
});

test("failed request restores input for retry", async ({ page }) => {
  await page.goto("/");
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Discovery is unavailable. Please try again.",
      }),
    }),
  );
  await page
    .getByRole("textbox", { name: "Describe a book" })
    .fill("The Hobbit");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".conversation")).toContainText(
    "Discovery is unavailable",
  );
  await expect(
    page.getByRole("textbox", { name: "Describe a book" }),
  ).toHaveValue("The Hobbit");
  await expect(
    page.getByRole("button", { name: "Search", exact: true }),
  ).toBeEnabled();
});
