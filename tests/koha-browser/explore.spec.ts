import { test, expect } from "@playwright/test";

test("visual route uses Koha, preserves constraints and opens book details", async ({
  page,
}) => {
  await page.goto("/explore");
  const collection = page.getByRole("region", {
    name: "Visual collection",
    exact: true,
  });
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await expect(
    page.getByText("KOHA SANDBOX · LIVE CATALOG RECORDS", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mystery", exact: true }).click();
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await expect(collection).toContainText("Subject: mystery");
  await page
    .getByLabel("Explore branch")
    .selectOption({ label: "Centerville" });
  await expect(collection).toHaveAttribute("aria-busy", "false");
  const shelf = page.getByRole("region", {
    name: "Available now at Centerville",
    exact: true,
  });
  await expect(shelf).toBeVisible();
  await shelf
    .getByRole("button", { name: "Before the frost /", exact: true })
    .click();
  const detail = page.getByRole("region", {
    name: "Details for Before the frost /",
    exact: true,
  });
  await expect(detail).toBeFocused();
  await detail
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("shelf.reading-list.v1") || "[]"),
    ),
  ).toHaveLength(1);
  await detail.getByRole("button", { name: /Add .* to comparison/ }).click();
  await page
    .getByRole("button", { name: "Compare selected titles (1)" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Close comparison", exact: true })
    .click();
  await detail
    .getByRole("button", { name: "More like this", exact: true })
    .click();
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await expect(
    page.getByText("YOUR STARTING POINT", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Explore branch")).toHaveValue("CPL");
  await page
    .getByRole("textbox", { name: "Where should we go next?" })
    .fill("zzzzneveracatalogmatchzzzz");
  await page
    .getByRole("textbox", { name: "Where should we go next?" })
    .press("Enter");
  await expect(collection).toHaveAttribute("aria-busy", "false");
  await expect(
    page.getByText("No verified matches on this shelf.", { exact: true }),
  ).toBeVisible();
});

for (const width of [1280, 768, 390, 320])
  test(`visual bookshelf fits ${width}px`, async ({ page }) => {
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
      path: test.info().outputPath(`explore-${width}.png`),
    });
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Visual bookshelf" }),
    ).toHaveAttribute("href", "/explore");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: /Your next chapter/ }),
    ).toBeVisible();
  });
