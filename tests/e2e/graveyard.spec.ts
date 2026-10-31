import { expect, test, type Page } from "@playwright/test";

const NOW = Date.now();
const iso = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

const repo = (id: number, name: string, days: number, stars = 3) => ({
  id,
  name,
  description: `About ${name}`,
  htmlUrl: `https://github.com/tester/${name}`,
  language: "Go",
  stars,
  forks: 0,
  createdAt: iso(2000),
  updatedAt: iso(days),
  pushedAt: iso(days),
  archived: false,
  fork: false,
});

const response = (repos: unknown[], extra = {}) => ({
  username: "tester",
  repos,
  forkCount: 0,
  includeForks: false,
  truncated: false,
  fetchedAt: new Date(NOW).toISOString(),
  stale: false,
  ...extra,
});

const REPOS = [repo(1, "alpha-lives", 2), repo(2, "beta-buried", 200, 40), repo(3, "gamma-ancient", 800, 150)];

async function mockApi(page: Page, status: number, body: unknown) {
  await page.route("**/api/github/**", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

async function skipIntro(page: Page) {
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("button", { name: "Reset camera" })).toBeVisible({ timeout: 30_000 });
}

test("landing rejects an invalid username and navigates on a valid one", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/");
  await page.getByLabel("GitHub username").fill("bad name");
  await page.getByRole("button", { name: "Open the gates" }).click();
  await expect(page.locator("#username-problem")).toContainText("letters, numbers and hyphens");
  await page.getByLabel("GitHub username").fill("tester");
  await page.getByRole("button", { name: "Open the gates" }).click();
  await expect(page).toHaveURL(/\/graveyard\/tester$/);
});

test("demo mode is labelled and renders a canvas", async ({ page }) => {
  await page.goto("/demo");
  await skipIntro(page);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("Demo: invented repositories", { exact: false })).toBeVisible();
});

test("a direct URL opens details through the list, and Esc closes them", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard/tester");
  await skipIntro(page);
  await page.getByRole("button", { name: "Show list" }).click();
  await page.getByRole("button", { name: /beta-buried/ }).click();
  const panel = page.getByRole("complementary", { name: "Details for beta-buried" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Open on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/tester/beta-buried",
  );
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("clicking a grave in the canvas opens its details", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard/tester");
  await skipIntro(page);
  await page.waitForTimeout(1000);
  const point = await page.evaluate(() =>
    (window as unknown as { __graveyard: { screenPosition: (id: number) => { x: number; y: number } } }).__graveyard.screenPosition(3),
  );
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(300);
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole("complementary", { name: "Details for gamma-ancient" })).toBeVisible({ timeout: 15_000 });
});

test("Demo Resurrection completes and is labelled", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard/tester");
  await skipIntro(page);
  await page.getByRole("button", { name: "Show list" }).click();
  await page.getByRole("button", { name: /gamma-ancient/ }).click();
  await page.getByRole("button", { name: "Demo Resurrection" }).click();
  await expect(page.getByText("Resurrected for this visit only", { exact: false })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("your GitHub data is untouched", { exact: false })).toBeVisible();
});

test("API error states are distinct", async ({ page }) => {
  await mockApi(page, 404, { error: { code: "not_found", message: "none" } });
  await page.goto("/graveyard/tester");
  await expect(page.getByRole("heading", { name: "No such account" })).toBeVisible();
  await page.unroute("**/api/github/**");
  await mockApi(page, 429, { error: { code: "rate_limited", message: "limit", retryAfter: 90 } });
  await page.goto("/graveyard/tester");
  await expect(page.getByRole("heading", { name: "GitHub rate limit reached" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Try again in \d+s/ })).toBeDisabled();
});

test("empty and all-fork accounts get their own messages", async ({ page }) => {
  await mockApi(page, 200, response([]));
  await page.goto("/graveyard/tester");
  await expect(page.getByRole("heading", { name: "Nothing buried yet" })).toBeVisible();
  await page.unroute("**/api/github/**");
  await mockApi(page, 200, response([], { forkCount: 4 }));
  await page.goto("/graveyard/tester");
  await expect(page.getByRole("heading", { name: "Only forks here" })).toBeVisible();
});

test("without WebGL the list fallback still works", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
  });
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard/tester");
  await expect(page.getByText("can't run in this browser", { exact: false })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: /alpha-lives/ }).click();
  await expect(page.getByRole("complementary", { name: "Details for alpha-lives" })).toBeVisible();
});
