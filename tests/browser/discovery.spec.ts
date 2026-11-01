import { test, expect, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
const run = promisify(execFile);
const cards = (page: Page) => page.locator("article.book");
async function ready(page: Page) {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
async function search(page: Page, message: string) {
  await page.getByRole("textbox", { name: "Describe a book" }).fill(message);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

test("complete bookshelf search, branch, inspector, reading list and empty-state flow", async ({
  page,
}) => {
  await ready(page);
  await expect(cards(page)).toHaveCount(12);
  await search(page, "find Project Hail Mary");
  const book = page.getByRole("article", {
    name: "Project Hail Mary",
    exact: true,
  });
  await expect(book).toBeVisible();
  await page.getByLabel("Look at").selectOption("RUST");
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await book.locator("summary").click();
  await expect(book).toContainText(/Rust\s*0 demo copies/);
  await page.getByRole("button", { name: "Show Discovery Engine" }).click();
  await expect(
    page.getByRole("region", { name: "Discovery Engine inspector" }),
  ).toContainText("disabled");
  await book
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(page.locator(".savedArea")).toContainText("Project Hail Mary");
  await page.getByRole("button", { name: "Copy reading list" }).click();
  await expect(page.locator('.savedArea [role="status"]')).not.toBeEmpty();
  await page.getByRole("button", { name: "Clear reading list" }).click();
  await expect(page.locator(".saved-titles li")).toHaveCount(0);
  await search(page, "Only mysteries");
  await expect(cards(page).first()).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Discovery Engine inspector" }),
  ).toContainText("mystery");
  await search(page, "zzzxxyy");
  await expect(cards(page)).toHaveCount(0);
  await expect(
    page.getByText("No matching demo titles yet. Try a broader search."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(cards(page)).toHaveCount(12);
});

test("explicit similarity, format controls, comparison and keyboard dismissal", async ({
  page,
}) => {
  await ready(page);
  const selected = await cards(page).first().locator("h3").textContent();
  await cards(page)
    .first()
    .getByRole("button", { name: "More like this" })
    .click();
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.getByRole("article", { name: selected!, exact: true }),
  ).toHaveCount(0);
  await expect(cards(page).first()).toBeVisible();
  await page.getByLabel("Book format").selectOption("audiobook");
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(cards(page).first().locator(".bookFormat")).toContainText(
    "Audiobook",
  );
  const first = cards(page).nth(0),
    second = cards(page).nth(1);
  const titles = [
    await first.locator("h3").textContent(),
    await second.locator("h3").textContent(),
  ];
  await first.getByRole("button", { name: /Add .* to comparison/ }).click();
  await second.getByRole("button", { name: /Add .* to comparison/ }).click();
  await page.getByRole("button", { name: "Compare titles" }).click();
  const dialog = page.getByRole("dialog", { name: "Compare your discoveries" });
  await expect(dialog).toBeVisible();
  for (const title of titles) await expect(dialog).toContainText(title!);
  await expect(dialog.getByRole("table")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("mobile layout fits; reading list persists across reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page
    .getByRole("button", { name: "An adventure for kids", exact: false })
    .first()
    .click();
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(cards(page).first()).toBeVisible();
  await cards(page)
    .first()
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(cards(page).first()).toBeVisible();
  await expect(page.locator(".nav-count")).toHaveText("1");
  await page.getByRole("button", { name: /My shelf/ }).click();
  await expect(page.locator(".saved-titles li")).toHaveCount(1);
});

test("failed request preserves input and exact request retry succeeds", async ({
  page,
}) => {
  await ready(page);
  let failed = false;
  await page.route("**/api/chat", (route) => {
    if (!failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Discovery is unavailable. Please try again.",
        }),
      });
    }
    return route.continue();
  });
  await search(page, "The Hobbit");
  await expect(page.getByRole("alert", { name: "Search error" })).toContainText(
    "Discovery is unavailable",
  );
  await expect(
    page.getByRole("textbox", { name: "Describe a book" }),
  ).toHaveValue("The Hobbit");
  await page.getByRole("button", { name: "Retry search" }).click();
  await expect(
    page.getByRole("article", { name: "The Hobbit", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert", { name: "Search error" })).toHaveCount(
    0,
  );
});

test("ordinal references use displayed order and clarification retains cards", async ({
  page,
}) => {
  await ready(page);
  await search(page, "space");
  const selected = await cards(page).nth(1).locator("h3").textContent();
  await search(page, "More like the second one, but shorter");
  await expect(cards(page).first()).toBeVisible();
  await expect(
    page.getByRole("article", { name: selected!, exact: true }),
  ).toHaveCount(0);
  const before = await cards(page).locator("h3").allTextContents();
  await search(page, "More like result 99");
  await expect(page.locator(".conversation")).toContainText(
    "Which displayed title",
  );
  expect(await cards(page).locator("h3").allTextContents()).toEqual(before);
});

test("changing independent catalog stock updates the visible edition availability", async ({
  page,
}) => {
  const state = resolve(".local/e2e-catalog.json");
  const stock = async (copies: number) =>
    run(process.execPath, [
      "--import",
      "tsx",
      "scripts/catalog-server.ts",
      "set-stock",
      "--state",
      state,
      "--record",
      "demo-1",
      "--branch",
      "RUST",
      "--copies",
      String(copies),
    ]);
  await ready(page);
  await search(page, "find Project Hail Mary");
  await page.getByLabel("Look at").selectOption("RUST");
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const book = page.getByRole("article", {
    name: "Project Hail Mary",
    exact: true,
  });
  await book.locator("summary").click();
  await expect(book).toContainText(/Rust\s*0 demo copies/);
  try {
    await stock(3);
    await search(page, "find Project Hail Mary");
    if (
      !(await book.locator("details").evaluate((e) => e.hasAttribute("open")))
    )
      await book.locator("summary").click();
    await expect(book).toContainText(/Rust\s*3 demo copies/);
  } finally {
    await stock(0);
  }
});
