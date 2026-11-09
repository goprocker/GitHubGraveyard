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
  private: id === 2,
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
  await page.route("**/api/graveyard**", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

async function skipIntro(page: Page) {
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("button", { name: "Reset camera" })).toBeVisible({ timeout: 30_000 });
}

test("landing opens the graveyard", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/");
  await page.getByRole("link", { name: "Or visit the owner's graveyard" }).click();
  await expect(page).toHaveURL(/\/graveyard$/);
});

test("landing opens any user's graveyard", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/");
  await page.getByLabel("GitHub username").fill("@octocat");
  await page.getByRole("button", { name: "Open the gates" }).click();
  await expect(page).toHaveURL(/\/graveyard\?user=octocat$/);
});

test("every route requires the password", async ({ browser, baseURL }) => {
  const anonymous = await browser.newContext({ httpCredentials: undefined });
  for (const path of ["/", "/graveyard", "/api/graveyard"]) {
    const result = await anonymous.request.get(`${baseURL}${path}`);
    expect(result.status()).toBe(401);
  }
  const wrong = await browser.newContext({ httpCredentials: { username: "owner", password: "wrong" } });
  expect((await wrong.request.get(`${baseURL}/api/graveyard`)).status()).toBe(401);
  await anonymous.close();
  await wrong.close();
});

test("the removed public routes are gone", async ({ page }) => {
  for (const path of ["/demo", "/graveyard/octocat", "/api/github/octocat"]) {
    expect((await page.request.get(path)).status()).toBe(404);
  }
});

test("a private repository is labelled", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard");
  await skipIntro(page);
  await page.getByRole("button", { name: "Show list" }).click();
  await page.getByRole("button", { name: /beta-buried/ }).click();
  await expect(page.getByRole("complementary").getByText("Private", { exact: true })).toBeVisible();
});

test("a direct URL opens details through the list, and Esc closes them", async ({ page }) => {
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard");
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
  await page.goto("/graveyard");
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
  await page.goto("/graveyard");
  await skipIntro(page);
  await page.getByRole("button", { name: "Show list" }).click();
  await page.getByRole("button", { name: /gamma-ancient/ }).click();
  await page.getByRole("button", { name: "Demo Resurrection" }).click();
  await expect(page.getByText("Resurrected for this visit only", { exact: false })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("your GitHub data is untouched", { exact: false })).toBeVisible();
});

test("API error states are distinct", async ({ page }) => {
  await mockApi(page, 503, { error: { code: "not_configured", message: "Set GITHUB_TOKEN" } });
  await page.goto("/graveyard");
  await expect(page.getByRole("heading", { name: "GitHub token needed" })).toBeVisible();
  await page.unroute("**/api/graveyard**");
  await mockApi(page, 429, { error: { code: "rate_limited", message: "limit", retryAfter: 90 } });
  await page.goto("/graveyard");
  await expect(page.getByRole("heading", { name: "GitHub rate limit reached" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Try again in \d+s/ })).toBeDisabled();
});

test("empty and all-fork accounts get their own messages", async ({ page }) => {
  await mockApi(page, 200, response([]));
  await page.goto("/graveyard");
  await expect(page.getByRole("heading", { name: "Nothing buried yet" })).toBeVisible();
  await page.unroute("**/api/graveyard**");
  await mockApi(page, 200, response([], { forkCount: 4 }));
  await page.goto("/graveyard");
  await expect(page.getByRole("heading", { name: "Only forks here" })).toBeVisible();
});

test("without WebGL the list fallback still works", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
  });
  await mockApi(page, 200, response(REPOS));
  await page.goto("/graveyard");
  await expect(page.getByText("can't run in this browser", { exact: false })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: /alpha-lives/ }).click();
  await expect(page.getByRole("complementary", { name: "Details for alpha-lives" })).toBeVisible();
});
