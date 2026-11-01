import { test, expect } from "@playwright/test";

test("headline rotates without shifting layout, pauses, and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const active = page.locator(".headline-phrases .is-active");
  await expect(active).toHaveText("Closer than you think.");
  const initial = await page.locator(".rotating-headline").boundingBox();
  await expect(active).toHaveText("Waiting to be opened.", { timeout: 7000 });
  const next = await page.locator(".rotating-headline").boundingBox();
  expect(next?.height).toBe(initial?.height);
  await page.getByRole("button", { name: "Pause rotating headline" }).click();
  const paused = await active.textContent();
  await page.waitForTimeout(4800);
  await expect(active).toHaveText(paused!);
  await page.getByRole("button", { name: "Resume rotating headline" }).click();
  await expect(active).not.toHaveText(paused!, { timeout: 7000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".headline-motion-toggle")).toHaveCount(0);
  const reduced = await active.textContent();
  await page.waitForTimeout(4800);
  await expect(active).toHaveText(reduced!);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
