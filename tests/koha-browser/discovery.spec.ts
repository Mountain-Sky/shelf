import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".demo-badge")).toContainText("Koha sandbox");
}
async function search(page: Page, title: string) {
  await page.getByRole("textbox", { name: "Describe a book" }).fill(title);
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/chat") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const data = await (await response).json();
  expect(data.source).toBe("koha");
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

test("real Koha title, branch counts, refresh and browser-local reading list", async ({
  page,
}) => {
  await ready(page);
  await search(page, "Find The Left Hand of Darkness");
  const card = page.getByRole("article", {
    name: "The Left Hand of Darkness",
    exact: true,
  });
  await expect(card).toContainText("Cover unavailable · placeholder");
  await expect(card.locator(".holding-available")).toContainText("Rust");
  await page.getByLabel("Look at").selectOption("ASH");
  await expect(card.locator(".branch-holdings li")).toHaveCount(1);
  await expect(card.locator(".branch-holdings")).toContainText(
    /Ashburn\s*0 available/,
  );
  await page.getByLabel("Look at").selectOption("RUST");
  await expect(card.locator(".branch-holdings")).toContainText(
    /Rust\s*1 available/,
  );
  await page
    .getByRole("button", { name: "Refresh availability", exact: true })
    .click();
  await expect(page.locator("#discoveries")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(card.locator(".branch-holdings")).toContainText(
    /Rust\s*1 available/,
  );
  await card
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(page.locator(".saved-titles li")).toHaveCount(1);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("shelf.reading-list.v1")!),
  );
  expect(Object.keys(stored[0]).sort()).toEqual(["author", "id", "title"]);
  await page.reload();
  await expect(page.locator(".nav-count")).toHaveText("1");
  await page.getByRole("button", { name: /My shelf/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download reading list" }).click();
  expect((await download).suggestedFilename()).toBe("shelf-reading-list.txt");
  await page.getByRole("button", { name: "Find in catalog" }).click();
  await expect(card).toBeVisible();
  await page
    .getByRole("button", { name: "Clear reading list", exact: true })
    .click();
  await expect(page.locator(".nav-count")).toHaveText("0");
  await page.reload();
  await expect(page.locator(".nav-count")).toHaveText("0");
});

test("missing external cover stays labeled and unknown holdings are never zero", async ({
  page,
}) => {
  await page.route("https://covers.openlibrary.org/**", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await ready(page);
  await search(page, "Find E Street shuffle");
  // Koha contains distinct records with this title; do not assume a title is an identity.
  const card = page
    .getByRole("article", {
      name: "E Street shuffle :",
      exact: true,
    })
    .first();
  await expect(card).toContainText("Cover unavailable · placeholder");
  await expect(card.locator("img")).toHaveCount(0);
  // Exercise degraded availability through the presentation boundary, never by mutating Koha.
  await page.route("**/api/chat", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    for (const book of data.books)
      book.availability = [
        {
          branch: "RUST",
          status: "unknown",
          copies: null,
          source: "koha",
          observedAt: new Date().toISOString(),
        },
      ];
    await route.fulfill({ response, json: data });
  });
  await page
    .getByRole("button", { name: "Refresh availability", exact: true })
    .click();
  await expect(card.locator(".branch-holdings")).toContainText(
    "Availability unknown",
  );
  await expect(card.locator(".branch-holdings")).not.toContainText(
    "0 available",
  );
});

test("storage failure is visible and mobile cards fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await ready(page);
  await search(page, "Find The Left Hand of Darkness");
  await page
    .getByRole("article", { name: "The Left Hand of Darkness", exact: true })
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(page.locator(".reading-list-note")).toContainText(
    "could not be saved",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mystery pickup request does not display unrelated Koha books", async ({
  page,
}) => {
  await ready(page);
  await search(page, "Find The Left Hand of Darkness");
  await expect(page.getByRole("article")).not.toHaveCount(0);
  await search(page, "I want a mystery to pick up tomorrow at Rust");
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByLabel("Look at")).toHaveValue("RUST");
  await expect(page.locator(".empty")).toContainText("No titles matched");
  await expect(page.locator(".empty")).toContainText(
    "Future pickup availability is not confirmed",
  );
});

test("cataloged mystery pickup uses real Centerville holdings", async ({
  page,
}) => {
  await ready(page);
  await search(page, "I want a mystery to pick up tomorrow at Centerville");
  const card = page.getByRole("article", {
    name: "Before the frost /",
    exact: true,
  });
  await expect(card).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByLabel("Look at")).toHaveValue("CPL");
  await expect(card.locator(".branch-holdings")).toContainText(
    /Centerville\s*1 available/,
  );
  await expect(page.locator(".conversation .assistant")).toContainText(
    "Future pickup availability is not confirmed",
  );
  await page.getByLabel("Look at").selectOption("MPL");
  await expect(
    page.getByRole("article", { name: "The ice princess /", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
});
