import { expect, test, type Page } from "@playwright/test";

const HIGH_BUDGET = 450;
const LOW_BUDGET = 250;
const OUT = process.env.SHOT_DIR;

const iso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

// Stars and ages cycle so that every tier and status is present.
const REPOS = Array.from({ length: 120 }, (_, index) => ({
  id: index + 1,
  name: `repository-${index + 1}`,
  description: null,
  htmlUrl: null,
  language: "Go",
  stars: [0, 7, 30, 150][index % 4],
  forks: 0,
  createdAt: iso(3000),
  updatedAt: iso(5),
  pushedAt: iso([3, 60, 200, 900][index % 4] as number),
  archived: index % 10 === 0,
  fork: false,
  private: index % 3 === 0,
}));

const skipIntro = async (page: Page) => {
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("button", { name: "Reset camera" })).toBeVisible({ timeout: 60_000 });
};

const drawCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __graveyard: { drawCalls: () => number } }).__graveyard.drawCalls());

test("the 100-grave cap stays within the draw call budgets", async ({ page }) => {
  test.setTimeout(300_000);
  await page.route("**/api/graveyard**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        username: "owner",
        repos: REPOS,
        forkCount: 0,
        includeForks: false,
        truncated: false,
        fetchedAt: new Date().toISOString(),
        stale: false,
      }),
    }),
  );
  await page.addInitScript(() => window.localStorage.setItem("graveyard-quality", "high"));
  await page.goto("/graveyard");
  await skipIntro(page);
  await page.waitForTimeout(4000);
  const high = await drawCalls(page);
  if (OUT) await page.screenshot({ path: `${OUT}/hundred.png` });

  await page.getByRole("button", { name: "Quality: high" }).click();
  await expect(page.getByRole("button", { name: "Quality: low" })).toBeVisible();
  await page.waitForTimeout(4000);
  const low = await drawCalls(page);

  console.log(`draw calls at 100 graves: high ${high}, low ${low}`);
  expect(high).toBeLessThanOrEqual(HIGH_BUDGET);
  expect(low).toBeLessThanOrEqual(LOW_BUDGET);
  await expect(page.getByText("top 100 of 120", { exact: false })).toBeHidden();
  await page.getByRole("button", { name: "Show list" }).click();
  await expect(page.getByText("top 100 of 120", { exact: false })).toBeVisible();
});
