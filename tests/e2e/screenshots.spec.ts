import { test, expect } from "@playwright/test";

const OUT = process.env.SHOT_DIR;

// Review aid rather than an assertion suite. Runs only when SHOT_DIR is set.
test.skip(!OUT, "Set SHOT_DIR to capture review screenshots");

test("capture key moments", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/landing.png` });

  await page.goto("/demo");
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/gate.png` });

  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("button", { name: "Reset camera" })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/overview.png` });
  console.log(
    "draw calls",
    await page.evaluate(() => (window as unknown as { __graveyard: { drawCalls: () => number } }).__graveyard.drawCalls()),
  );

  await page.getByRole("button", { name: "Show list" }).click();
  await page.getByRole("button", { name: /ml-stock-predictor/ }).click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/focused.png` });

  await page.getByRole("button", { name: "Demo Resurrection" }).click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/resurrection.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: `${OUT}/mobile-landing.png` });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("button", { name: "Reset camera" })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/mobile-scene.png` });

  console.log("page errors", JSON.stringify(errors));
});
