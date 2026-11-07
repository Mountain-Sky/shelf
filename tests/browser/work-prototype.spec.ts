import { test, expect } from "@playwright/test";

test("bookshelf landing, search, branch, details, save, compare and reading list", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(r.url());
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/explore$/);
  const collection = page.getByRole("region", {
    name: "Visual collection",
    exact: true,
  });
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await expect(collection).toContainText("DEMO COLLECTION");
  const prompt = page.getByRole("textbox", {
    name: "Where should we go next?",
  });
  await prompt.fill("Find The Hobbit");
  await prompt.press("Enter");
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await expect(
    collection.getByRole("button", { name: "The Hobbit", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Explore branch").selectOption("ASH");
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await collection
    .getByRole("button", { name: "The Hobbit", exact: true })
    .click();
  const detail = page.getByRole("region", {
    name: "Details for The Hobbit",
    exact: true,
  });
  await expect(detail).toBeFocused();
  await detail
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /My shelf · 1/ })).toBeVisible();
  await detail.getByRole("button", { name: /Add .* to comparison/ }).click();
  await page
    .getByRole("button", { name: "Compare selected titles (1)" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Close comparison", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Request hold", exact: true }),
  ).toHaveCount(0);
  await prompt.fill("zzzzneveracatalogmatchzzzz");
  await prompt.press("Enter");
  await expect(
    page.getByText("No verified matches on this shelf.", { exact: true }),
  ).toBeVisible();
  await page.goto("/classic");
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByRole("button", { name: /My shelf/ })
    .first()
    .click();
  await expect(page.locator(".savedArea")).toContainText("The Hobbit");
  await expect(
    page.getByRole("button", { name: "Library account", exact: true }),
  ).toHaveCount(0);
  expect(external).toEqual([]);
  expect((await page.request.get("/api/account")).status()).toBe(404);
});

for (const width of [1280, 390, 320])
  test(`bookshelf fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/explore");
    await expect(
      page.getByRole("region", { name: "Visual collection", exact: true }),
    ).toHaveAttribute("aria-busy", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`bookshelf-${width}.png`),
      fullPage: true,
    });
  });
