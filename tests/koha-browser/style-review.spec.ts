import { test, expect } from "@playwright/test";
import fs from "node:fs";
const out = process.env.SHELF_VISUAL_OUTPUT;
for (const width of [1280, 768, 390, 320])
  test(`interface review at ${width}px`, async ({ page }) => {
    test.skip(
      !process.env.SHELF_KOHA_ACCOUNT_FIXTURE,
      "Explicit synthetic credentials required",
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("#discoveries")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    const check = async (name: string) => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: out
          ? `${out}/style-${width}-${name}.png`
          : test.info().outputPath(`${name}.png`),
      });
    };
    await check("home");
    const cards = page.getByRole("article");
    await cards
      .first()
      .getByRole("button", { name: "Save for later", exact: true })
      .click();
    await page.getByRole("button", { name: /My shelf/ }).click();
    await page.locator(".savedArea").scrollIntoViewIfNeeded();
    await check("reading-list");
    await cards
      .first()
      .getByRole("button", { name: /Add .* to comparison/ })
      .click();
    await cards
      .nth(1)
      .getByRole("button", { name: /Add .* to comparison/ })
      .click();
    await page
      .getByRole("button", { name: "Compare titles", exact: true })
      .click();
    await check("comparison");
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Library account", exact: true })
      .click();
    await check("login");
    const c = JSON.parse(
      fs.readFileSync(process.env.SHELF_KOHA_ACCOUNT_FIXTURE!, "utf8"),
    );
    await page.getByLabel("Library username").fill(c.username);
    await page.getByLabel("Password", { exact: true }).fill(c.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("Shelf circulation test LOAN", { exact: true }),
    ).toBeVisible();
    await check("account");
    await page.getByRole("button", { name: "Close library account" }).click();
    await cards
      .first()
      .getByRole("button", { name: "Request hold", exact: true })
      .click();
    await expect(page.getByLabel("Pickup branch")).toBeVisible();
    await check("hold");
    await page.getByRole("button", { name: "Close library account" }).click();
    await cards.first().scrollIntoViewIfNeeded();
    await cards.first().locator("summary").click();
    await check("edition");
    await page
      .getByRole("textbox", { name: "Describe a book" })
      .fill("I want a mystery to pick up tomorrow at Rust");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".empty")).toBeVisible();
    await page.locator(".empty").scrollIntoViewIfNeeded();
    await check("empty");
  });
