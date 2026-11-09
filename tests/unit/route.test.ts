import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/graveyard/route";
import { clearCache } from "@/lib/github/cache";
import { MAX_PAGES } from "@/lib/github/client";

const repo = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `repo-${id}`,
  description: "d".repeat(500),
  html_url: `https://github.com/me/repo-${id}`,
  language: "Go",
  stargazers_count: 2,
  forks_count: 1,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-02T00:00:00Z",
  pushed_at: "2020-01-03T00:00:00Z",
  archived: false,
  fork: false,
  private: false,
  private_note: "must not leak",
  ...extra,
});

const json = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init);
const call = (query = "") => GET(new Request(`http://test/api/graveyard${query}`));
const fetchMock = vi.fn<typeof fetch>();

/** Answers /user with a login and the repository list with the given handler. */
function github(repos: () => Response | Promise<Response>) {
  fetchMock.mockImplementation(async (input) =>
    String(input).endsWith("/user") ? json({ login: "me" }) : repos(),
  );
}

beforeEach(() => {
  clearCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GITHUB_TOKEN", "secret-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/graveyard", () => {
  it("refuses to run without a token and calls nothing", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const response = await call();
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a rejected token", async () => {
    fetchMock.mockResolvedValue(json({}, { status: 401 }));
    const response = await call();
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("invalid_token");
  });

  it("maps rate limiting with Retry-After", async () => {
    github(() => json({}, { status: 403, headers: { "x-ratelimit-remaining": "0", "retry-after": "120" } }));
    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
  });

  it("maps other upstream failures and timeouts", async () => {
    github(() => json({}, { status: 500 }));
    expect((await call()).status).toBe(502);
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new DOMException("slow", "TimeoutError"));
    expect((await call()).status).toBe(504);
  });

  it("asks for the owner's public and private repositories only", async () => {
    vi.stubEnv("GRAVEYARD_PASSWORD", "s3cret");
    github(() => json([]));
    await call();
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls[0]).toBe("https://api.github.com/user");
    expect(urls[1]).toContain("https://api.github.com/user/repos?");
    expect(urls[1]).toContain("affiliation=owner");
    expect(urls[1]).toContain("visibility=all");
  });

  it("asks for public repositories only without a password", async () => {
    vi.stubEnv("GRAVEYARD_PASSWORD", "");
    github(() => json([]));
    await call();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("visibility=public");
  });

  it("includes and labels private repositories", async () => {
    github(() => json([repo(1, { private: true }), repo(2)]));
    const body = await (await call()).json();
    expect(body.username).toBe("me");
    expect(body.repos.map((item: { private: boolean }) => item.private)).toEqual([true, false]);
  });

  it("never allows shared caching", async () => {
    github(() => json([repo(1, { private: true })]));
    expect((await call()).headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("allowlists fields, truncates and drops unsafe URLs", async () => {
    github(() => json([repo(1, { html_url: "javascript:alert(1)" })]));
    const body = await (await call()).json();
    expect(body.repos[0].description).toHaveLength(300);
    expect(body.repos[0].htmlUrl).toBeNull();
    expect(JSON.stringify(body)).not.toContain("must not leak");
  });

  it("stops at the page bound and reports truncation", async () => {
    let next = 0;
    github(() => json(Array.from({ length: 100 }, () => repo(++next))));
    const body = await (await call()).json();
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PAGES + 1);
    expect(body.truncated).toBe(true);
  });

  it("sends the token to GitHub but never to the client", async () => {
    github(() => json([repo(1)]));
    const text = await (await call()).text();
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(text).not.toContain("secret-token");
  });

  it("serves toggling forks from cache", async () => {
    github(() => json([repo(1), repo(2, { fork: true })]));
    const without = await (await call()).json();
    const calls = fetchMock.mock.calls.length;
    const withForks = await (await call("?includeForks=true")).json();
    expect(without.repos).toHaveLength(1);
    expect(without.forkCount).toBe(1);
    expect(withForks.repos).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it("loads another user's public repositories by username", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/users/Octo-Cat") ? json({ login: "octo-cat" }) : json([repo(1)]),
    );
    const body = await (await call("?user=Octo-Cat")).json();
    expect(body.username).toBe("octo-cat");
    expect(body.repos).toHaveLength(1);
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls[1]).toContain("https://api.github.com/users/octo-cat/repos?");
    expect(urls[1]).toContain("type=owner");
  });

  it("rejects invalid usernames without calling GitHub", async () => {
    for (const user of ["-bad", "a/b", "x".repeat(40), "a--b"]) {
      expect((await call(`?user=${encodeURIComponent(user)}`)).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports unknown users as not found", async () => {
    fetchMock.mockResolvedValue(json({ message: "Not Found" }, { status: 404 }));
    const response = await call("?user=nobody-here");
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("user_not_found");
  });
});
