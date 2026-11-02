import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("local Koha account session, CSRF, identity isolation and logout", async ({
  page,
  request,
}) => {
  test.skip(
    !process.env.SHELF_KOHA_ACCOUNT_FIXTURE,
    "Explicit local synthetic credential file required",
  );
  const c = JSON.parse(
    fs.readFileSync(process.env.SHELF_KOHA_ACCOUNT_FIXTURE!, "utf8"),
  );
  expect((await request.get("/api/account")).status()).toBe(401);
  expect(
    (
      await request.post("/api/account", { data: { action: "logout" } })
    ).status(),
  ).toBe(403);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Library account", exact: true })
    .click();
  await page.getByLabel("Username").fill(c.username);
  await page.getByLabel("Password").fill(c.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Shelf circulation test LOAN", { exact: true }),
  ).toBeVisible();
  const cookies = await page.context().cookies();
  const session = cookies.find((x) => x.name === "shelf_patron");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).not.toContain(c.password);
  expect(stored).not.toContain(c.username);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/account")).status()).toBe(401);
});
