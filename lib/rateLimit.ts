const WINDOW_MS = 60_000;
export const MAX_REQUESTS = 10;
// Bounds memory when many different addresses arrive at once.
const MAX_CLIENTS = 10_000;

// Request times per client in the current window. Per server instance, like the repository cache.
const hits = new Map<string, number[]>();

/** Records one request and returns how many seconds to wait, or 0 when it is allowed. */
export function checkRateLimit(client: string, now = Date.now()): number {
  const recent = (hits.get(client) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(client, recent);
    return Math.max(1, Math.ceil((recent[0]! + WINDOW_MS - now) / 1000));
  }
  recent.push(now);
  hits.delete(client);
  hits.set(client, recent);
  if (hits.size > MAX_CLIENTS) hits.delete(hits.keys().next().value!);
  return 0;
}

/** The caller's address as reported by the hosting proxy, or a shared bucket when absent. */
export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function clearRateLimit(): void {
  hits.clear();
}
