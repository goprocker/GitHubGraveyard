import { fetchOwnRepos, type FetchedRepos } from "./client";

const TTL_MS = 10 * 60_000;

interface CacheEntry {
  data: FetchedRepos;
  fetchedAt: number;
}

// One owner means one entry, kept only in this server's memory.
let entry: CacheEntry | null = null;
let inFlight: Promise<CachedRepos> | null = null;

export interface CachedRepos extends FetchedRepos {
  fetchedAt: number;
  stale: boolean;
}

async function refresh(): Promise<CachedRepos> {
  try {
    const data = await fetchOwnRepos();
    const fetchedAt = Date.now();
    entry = { data, fetchedAt };
    return { ...data, fetchedAt, stale: false };
  } catch (error) {
    if (entry) return { ...entry.data, fetchedAt: entry.fetchedAt, stale: true };
    throw error;
  }
}

export function getRepos(): Promise<CachedRepos> {
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return Promise.resolve({ ...entry.data, fetchedAt: entry.fetchedAt, stale: false });
  }
  inFlight ??= refresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function clearCache(): void {
  entry = null;
  inFlight = null;
}
