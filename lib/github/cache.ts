import { fetchOwnRepos, type FetchedRepos } from "./client";

const TTL_MS = 10 * 60_000;
// Bounds memory now that anyone can look up any account.
const MAX_ENTRIES = 200;
const OWN = "";

interface CacheEntry {
  data: FetchedRepos;
  fetchedAt: number;
}

// Keyed by lowercased username, with OWN for the token owner. Kept only in this server's memory.
const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CachedRepos>>();

export interface CachedRepos extends FetchedRepos {
  fetchedAt: number;
  stale: boolean;
}

async function refresh(key: string, user?: string): Promise<CachedRepos> {
  try {
    const data = await fetchOwnRepos(user);
    const fetchedAt = Date.now();
    entries.delete(key);
    entries.set(key, { data, fetchedAt });
    if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    return { ...data, fetchedAt, stale: false };
  } catch (error) {
    const entry = entries.get(key);
    if (entry) return { ...entry.data, fetchedAt: entry.fetchedAt, stale: true };
    throw error;
  }
}

/** Without `user`, the token owner's repositories; with it, that account's public ones. */
export function getRepos(user?: string): Promise<CachedRepos> {
  const key = user === undefined ? OWN : user.toLowerCase();
  const entry = entries.get(key);
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return Promise.resolve({ ...entry.data, fetchedAt: entry.fetchedAt, stale: false });
  }
  let pending = inFlight.get(key);
  if (!pending) {
    pending = refresh(key, user).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

export function clearCache(): void {
  entries.clear();
  inFlight.clear();
}
