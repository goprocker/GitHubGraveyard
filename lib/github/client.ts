import type { Repo } from "../types";
import { GitHubError } from "./errors";
import { sanitizeRepo } from "./sanitize";

const PER_PAGE = 100;
export const MAX_PAGES = 5;
const TIMEOUT_MS = 8_000;

export interface FetchedRepos {
  repos: Repo[];
  truncated: boolean;
}

function requestHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-graveyard",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function retryAfterSeconds(response: Response): number | undefined {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (retryAfter > 0) return Math.ceil(retryAfter);
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  if (reset > 0) return Math.max(1, Math.ceil(reset - Date.now() / 1000));
  return undefined;
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true;
  return (
    response.status === 403 &&
    (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after"))
  );
}

async function fetchPage(username: string, page: number): Promise<unknown[]> {
  const url =
    `https://api.github.com/users/${encodeURIComponent(username)}/repos` +
    `?per_page=${PER_PAGE}&type=owner&sort=pushed&page=${page}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: requestHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new GitHubError("timeout", "GitHub took too long to respond. Try again in a moment.");
    }
    throw new GitHubError("upstream_error", "GitHub could not be reached. Try again in a moment.");
  }

  if (response.status === 404) {
    throw new GitHubError("not_found", `No GitHub account named ${username} exists.`);
  }
  if (isRateLimited(response)) {
    throw new GitHubError(
      "rate_limited",
      "The GitHub API rate limit was reached. Try again after the wait below.",
      retryAfterSeconds(response),
    );
  }
  if (!response.ok) {
    throw new GitHubError("upstream_error", `GitHub returned an error (${response.status}).`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GitHubError("upstream_error", "GitHub returned a response that could not be read.");
  }
  if (!Array.isArray(body)) {
    throw new GitHubError("upstream_error", "GitHub returned an unexpected response.");
  }
  return body;
}

/** Fetches up to MAX_PAGES pages of public repositories for a validated username. */
export async function fetchPublicRepos(username: string): Promise<FetchedRepos> {
  const repos: Repo[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const entries = await fetchPage(username, page);
    for (const entry of entries) {
      const repo = sanitizeRepo(entry);
      if (repo) repos.push(repo);
    }
    if (entries.length < PER_PAGE) return { repos, truncated: false };
  }
  // A full last page means more may exist, so the result is reported as truncated.
  return { repos, truncated: true };
}
