import { describe, expect, it } from "vitest";

import { calendarDaysSince, classifyRepo } from "@/lib/classify";
import { allEpitaphs, epitaphFor } from "@/lib/epitaphs";
import { enrichRepo, filterRepos, selectRendered } from "@/lib/filter";
import { CELL_SIZE, GRAVE_FOOTPRINT, generateLayout, generateScenery } from "@/lib/layout";
import { prestigeForStars } from "@/lib/prestige";
import { distanceToPath, PATH_HALF_WIDTH } from "@/lib/terrain";

const NOW = new Date("2026-06-15T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("classification", () => {
  it.each([
    [0, "alive"],
    [30, "alive"],
    [31, "forgotten"],
    [90, "forgotten"],
    [91, "buried"],
    [365, "buried"],
    [366, "ancient"],
  ])("%i days is %s", (days, status) => {
    const result = classifyRepo({ pushedAt: daysAgo(days), createdAt: daysAgo(999), archived: false }, NOW);
    expect(result.inactiveDays).toBe(days);
    expect(result.status).toBe(status);
  });

  it("counts calendar days across UTC midnight", () => {
    expect(calendarDaysSince("2026-06-14T23:59:59Z", new Date("2026-06-15T00:00:01Z"))).toBe(1);
    expect(calendarDaysSince("2026-06-15T00:00:01Z", new Date("2026-06-15T23:59:59Z"))).toBe(0);
  });

  it("gives archived precedence", () => {
    expect(classifyRepo({ pushedAt: daysAgo(1), createdAt: daysAgo(9), archived: true }, NOW).status).toBe("archived");
  });

  it("falls back to created date when pushed_at is null", () => {
    const result = classifyRepo({ pushedAt: null, createdAt: daysAgo(40), archived: false }, NOW);
    expect(result).toMatchObject({ usedCreatedDate: true, inactiveDays: 40, status: "forgotten" });
  });

  it("clamps future dates to 0", () => {
    expect(calendarDaysSince(daysAgo(-5), NOW)).toBe(0);
  });
});

describe("prestige", () => {
  it.each([
    [0, "basic"],
    [4, "basic"],
    [5, "decorative"],
    [19, "decorative"],
    [20, "elaborate"],
    [99, "elaborate"],
    [100, "monument"],
  ])("%i stars is %s", (stars, tier) => {
    expect(prestigeForStars(stars)).toBe(tier);
  });
});

describe("epitaphs", () => {
  it("is deterministic and from the pool", () => {
    expect(epitaphFor(42, "buried")).toBe(epitaphFor(42, "buried"));
    expect(allEpitaphs()).toContain(epitaphFor(42, "buried"));
  });
});

describe("layout", () => {
  const repos = (count: number) => Array.from({ length: count }, (_, i) => ({ id: i + 1, stars: (i * 37) % 150 }));

  it("is deterministic and independent of input order", () => {
    const input = repos(30);
    const byId = (layout: ReturnType<typeof generateLayout>) => [...layout.graves].sort((a, b) => a.id - b.id);
    expect(byId(generateLayout("Someone", input))).toEqual(byId(generateLayout("someone", [...input].reverse())));
  });

  it.each([0, 1, 5, 50, 100])("never overlaps or blocks the path at %i graves", (count) => {
    const { graves } = generateLayout("someone", repos(count));
    expect(graves).toHaveLength(count);
    for (const [index, a] of graves.entries()) {
      expect(distanceToPath(a.x, a.z)).toBeGreaterThan(PATH_HALF_WIDTH);
      for (const b of graves.slice(index + 1)) {
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(GRAVE_FOOTPRINT * 2 - 1e-6);
      }
    }
    expect(CELL_SIZE).toBeGreaterThan(GRAVE_FOOTPRINT * 2);
  });

  it("keeps scenery off graves and the path", () => {
    const layout = generateLayout("someone", repos(50));
    const scenery = generateScenery(layout, { trees: 30, rocks: 30, grass: 30 }, 5);
    for (const item of [...scenery.trees, ...scenery.rocks]) {
      expect(distanceToPath(item.x, item.z)).toBeGreaterThan(PATH_HALF_WIDTH);
      for (const grave of layout.graves) {
        expect(Math.hypot(grave.x - item.x, grave.z - item.z)).toBeGreaterThan(GRAVE_FOOTPRINT);
      }
    }
  });
});

describe("filtering", () => {
  const repo = (id: number, language: string, days: number, archived = false) => ({
    id,
    name: `repo-${id}`,
    description: null,
    htmlUrl: null,
    language,
    stars: 0,
    forks: 0,
    createdAt: daysAgo(3000),
    updatedAt: daysAgo(days),
    pushedAt: daysAgo(days),
    archived,
    fork: false,
    private: false,
  });
  const enriched = [
    repo(1, "Rust", 1),
    repo(2, "Go", 60),
    repo(3, "Rust", 200),
    repo(4, "C", 900),
    repo(5, "C", 900, true),
    repo(6, "Go", 900, true),
  ].map((item) => enrichRepo(item, NOW));

  it("covers every status in the demo", () => {
    expect(new Set(enriched.map((repo) => repo.status)).size).toBe(5);
  });

  it("filters by search and status", () => {
    expect(filterRepos(enriched, { query: "RUST", statuses: new Set() }).map((r) => r.language)).toEqual(["Rust", "Rust"]);
    expect(filterRepos(enriched, { query: "", statuses: new Set(["archived"]) })).toHaveLength(2);
    expect(filterRepos([], { query: "x", statuses: new Set() })).toEqual([]);
  });

  it("caps by stars, then push date, then ID", () => {
    const picked = selectRendered(
      [
        { id: 3, stars: 1, pushedAt: "2020-01-01" },
        { id: 2, stars: 5, pushedAt: "2019-01-01" },
        { id: 1, stars: 1, pushedAt: "2020-01-01" },
        { id: 4, stars: 1, pushedAt: null },
      ],
      3,
    );
    expect(picked.map((repo) => repo.id)).toEqual([2, 1, 3]);
  });
});
