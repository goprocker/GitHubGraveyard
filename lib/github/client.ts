import type { Repo } from "../types";
import { GitHubError } from "./errors";
import { sanitizeRepo } from "./sanitize";

const PER_PAGE = 100;
export const MAX_PAGES = 5;
const TIMEOUT_MS = 8_000;

export interface FetchedRepos {
  username: string;
  repos: Repo[];
  truncated: boolean;
}

function requestHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubError("not_configured", "Set GITHUB_TOKEN on the server to load your repositories.");
  }
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-graveyard",
    Authorization: `Bearer ${token}`,
  };
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

async function fetchJson(url: string, notFound?: GitHubError): Promise<unknown> {
  const headers = requestHeaders();

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new GitHubError("timeout", "GitHub took too long to respond. Try again in a moment.");
    }
    throw new GitHubError("upstream_error", "GitHub could not be reached. Try again in a moment.");
  }

  if (response.status === 404 && notFound) throw notFound;
  if (response.status === 401) {
    throw new GitHubError("invalid_token", "GitHub rejected GITHUB_TOKEN. Check that it is valid and not expired.");
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

  try {
    return await response.json();
  } catch {
    throw new GitHubError("upstream_error", "GitHub returned a response that could not be read.");
  }
}

async function fetchLogin(): Promise<string> {
  const user = (await fetchJson("https://api.github.com/user")) as { login?: unknown } | null;
  if (typeof user?.login !== "string") {
    throw new GitHubError("upstream_error", "GitHub returned an unexpected response.");
  }
  return user.login;
}

// GitHub logins are 1 to 39 letters, digits or single hyphens, not starting with a hyphen.
const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidUsername(value: string): boolean {
  return USERNAME.test(value);
}

async function fetchPage(page: number, user?: string): Promise<unknown[]> {
  // Without a password the site is public, so private repositories must stay hidden.
  const visibility = process.env.GRAVEYARD_PASSWORD ? "all" : "public";
  const body = await fetchJson(
    user
      ? `https://api.github.com/users/${user}/repos?per_page=${PER_PAGE}&type=owner&sort=pushed&page=${page}`
      : "https://api.github.com/user/repos" +
          `?per_page=${PER_PAGE}&affiliation=owner&visibility=${visibility}&sort=pushed&page=${page}`,
  );
  if (!Array.isArray(body)) {
    throw new GitHubError("upstream_error", "GitHub returned an unexpected response.");
  }
  return body;
}

async function fetchUserLogin(user: string): Promise<string> {
  const notFound = new GitHubError("user_not_found", `No GitHub user called ${user} was found.`);
  const body = (await fetchJson(`https://api.github.com/users/${user}`, notFound)) as { login?: unknown } | null;
  if (typeof body?.login !== "string") {
    throw new GitHubError("upstream_error", "GitHub returned an unexpected response.");
  }
  return body.login;
}

/**
 * Fetches up to MAX_PAGES pages of repositories. Without `user` these are the token owner's;
 * with it, that account's public repositories only.
 */
export async function fetchOwnRepos(user?: string): Promise<FetchedRepos> {
  if (user !== undefined && !isValidUsername(user)) {
    throw new GitHubError("invalid_username", "That isn't a valid GitHub username.");
  }
  const username = user === undefined ? await fetchLogin() : await fetchUserLogin(user);
  const repos: Repo[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const entries = await fetchPage(page, user === undefined ? undefined : username);
    for (const entry of entries) {
      const repo = sanitizeRepo(entry);
      if (repo) repos.push(repo);
    }
    if (entries.length < PER_PAGE) return { username, repos, truncated: false };
  }
  // A full last page means more may exist, so the result is reported as truncated.
  return { username, repos, truncated: true };
}
