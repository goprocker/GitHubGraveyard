import { normalizeUsername } from "../username";
import { fetchPublicRepos, type FetchedRepos } from "./client";
import { GitHubError } from "./errors";

const MAX_ENTRIES = 200;
const SUCCESS_TTL_MS = 10 * 60_000;
const NOT_FOUND_TTL_MS = 60_000;

type CacheEntry =
  | { kind: "found"; data: FetchedRepos; fetchedAt: number; expiresAt: number }
  | { kind: "missing"; error: GitHubError; expiresAt: number };

// Map iteration follows insertion order, so the first key is the least recently used.
const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CachedRepos>>();

export interface CachedRepos extends FetchedRepos {
  fetchedAt: number;
  stale: boolean;
}

function store(key: string, entry: CacheEntry): void {
  entries.delete(key);
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
}

async function refresh(key: string, username: string, previous?: CacheEntry): Promise<CachedRepos> {
  try {
    const data = await fetchPublicRepos(username);
    const fetchedAt = Date.now();
    store(key, { kind: "found", data, fetchedAt, expiresAt: fetchedAt + SUCCESS_TTL_MS });
    return { ...data, fetchedAt, stale: false };
  } catch (error) {
    if (error instanceof GitHubError && error.code === "not_found") {
      store(key, { kind: "missing", error, expiresAt: Date.now() + NOT_FOUND_TTL_MS });
      throw error;
    }
    if (previous?.kind === "found") {
      return { ...previous.data, fetchedAt: previous.fetchedAt, stale: true };
    }
    throw error;
  }
}

export function getRepos(username: string): Promise<CachedRepos> {
  const key = normalizeUsername(username);
  const entry = entries.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    store(key, entry);
    if (entry.kind === "missing") return Promise.reject(entry.error);
    return Promise.resolve({ ...entry.data, fetchedAt: entry.fetchedAt, stale: false });
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = refresh(key, username, entry).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export function clearCache(): void {
  entries.clear();
  inFlight.clear();
}
