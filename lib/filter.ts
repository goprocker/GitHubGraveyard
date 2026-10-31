import { classifyRepo } from "./classify";
import { epitaphFor } from "./epitaphs";
import { prestigeForStars } from "./prestige";
import type { EnrichedRepo, Repo, RepoStatus } from "./types";

export const MAX_RENDERED_GRAVES = 100;

export function enrichRepo(repo: Repo, now: Date): EnrichedRepo {
  const { status, inactiveDays, usedCreatedDate } = classifyRepo(repo, now);
  return {
    ...repo,
    status,
    inactiveDays,
    usedCreatedDate,
    tier: prestigeForStars(repo.stars),
    epitaph: epitaphFor(repo.id, status),
  };
}

export function excludeForks<T extends Pick<Repo, "fork">>(repos: readonly T[]): T[] {
  return repos.filter((repo) => !repo.fork);
}

export interface RepoFilters {
  query: string;
  /** Statuses to show. An empty set shows all of them. */
  statuses: ReadonlySet<RepoStatus>;
}

export function matchesFilters(
  repo: Pick<EnrichedRepo, "name" | "description" | "language" | "status">,
  { query, statuses }: RepoFilters,
): boolean {
  if (statuses.size > 0 && !statuses.has(repo.status)) return false;
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return [repo.name, repo.description, repo.language].some((field) =>
    field?.toLowerCase().includes(needle),
  );
}

export function filterRepos<T extends EnrichedRepo>(repos: readonly T[], filters: RepoFilters): T[] {
  return repos.filter((repo) => matchesFilters(repo, filters));
}

/** Picks the graves to render: most stars, then latest push, then ID for a stable tie-break. */
export function selectRendered<T extends Pick<Repo, "id" | "stars" | "pushedAt">>(
  repos: readonly T[],
  cap: number = MAX_RENDERED_GRAVES,
): T[] {
  return [...repos]
    .sort(
      (a, b) =>
        b.stars - a.stars ||
        (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "") ||
        a.id - b.id,
    )
    .slice(0, cap);
}
