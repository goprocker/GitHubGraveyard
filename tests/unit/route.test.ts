import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/github/[username]/route";
import { clearCache } from "@/lib/github/cache";
import { MAX_PAGES } from "@/lib/github/client";

const repo = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `repo-${id}`,
  description: "d".repeat(500),
  html_url: `https://github.com/u/repo-${id}`,
  language: "Go",
  stargazers_count: 2,
  forks_count: 1,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-02T00:00:00Z",
  pushed_at: "2020-01-03T00:00:00Z",
  archived: false,
  fork: false,
  private_note: "must not leak",
  ...extra,
});

const json = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init);
const call = (username: string, query = "") =>
  GET(new Request(`http://test/api/github/${username}${query}`), { params: Promise.resolve({ username }) });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  clearCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/github/[username]", () => {
  it("rejects a malformed username without calling GitHub", async () => {
    const response = await call("bad..name");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_username");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps 404", async () => {
    fetchMock.mockResolvedValue(json({}, { status: 404 }));
    const response = await call("ghost");
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });

  it("maps rate limiting with Retry-After", async () => {
    fetchMock.mockResolvedValue(json({}, { status: 403, headers: { "x-ratelimit-remaining": "0", "retry-after": "120" } }));
    const response = await call("limited");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect((await response.json()).error).toMatchObject({ code: "rate_limited", retryAfter: 120 });
  });

  it("maps other upstream failures", async () => {
    fetchMock.mockResolvedValue(json({}, { status: 500 }));
    const response = await call("broken");
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("upstream_error");
  });

  it("maps timeouts", async () => {
    fetchMock.mockRejectedValue(new DOMException("slow", "TimeoutError"));
    const response = await call("slow");
    expect(response.status).toBe(504);
    expect((await response.json()).error.code).toBe("timeout");
  });

  it("returns 200 for an empty account", async () => {
    fetchMock.mockResolvedValue(json([]));
    const response = await call("empty");
    expect(response.status).toBe(200);
    expect((await response.json()).repos).toEqual([]);
  });

  it("allowlists fields, truncates and drops unsafe URLs", async () => {
    fetchMock.mockResolvedValue(json([repo(1, { html_url: "javascript:alert(1)" })]));
    const body = await (await call("clean")).json();
    expect(body.repos[0].description).toHaveLength(300);
    expect(body.repos[0].htmlUrl).toBeNull();
    expect(JSON.stringify(body)).not.toContain("must not leak");
  });

  it("stops at the page bound and reports truncation", async () => {
    fetchMock.mockImplementation(async () =>
      json(Array.from({ length: 100 }, (_, i) => repo(Math.floor(Math.random() * 1e9) + i))),
    );
    const body = await (await call("huge")).json();
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PAGES);
    expect(body.truncated).toBe(true);
  });

  it("sends the token to GitHub but never to the client", async () => {
    vi.stubEnv("GITHUB_TOKEN", "secret-token");
    fetchMock.mockResolvedValue(json([repo(1)]));
    const text = await (await call("tokened")).text();
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(text).not.toContain("secret-token");
  });

  it("serves toggling forks from cache", async () => {
    fetchMock.mockResolvedValue(json([repo(1), repo(2, { fork: true })]));
    const without = await (await call("forky")).json();
    const withForks = await (await call("FORKY", "?includeForks=true")).json();
    expect(without.repos).toHaveLength(1);
    expect(without.forkCount).toBe(1);
    expect(withForks.repos).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
