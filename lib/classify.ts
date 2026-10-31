import type { Repo, RepoStatus } from "./types";

const MS_PER_DAY = 86_400_000;

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Whole UTC calendar days between two instants. Future dates count as 0. */
export function calendarDaysSince(iso: string, now: Date): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.round((utcDayStart(now) - utcDayStart(then)) / MS_PER_DAY));
}

export function statusForDays(days: number): Exclude<RepoStatus, "archived"> {
  if (days <= 30) return "alive";
  if (days <= 90) return "forgotten";
  if (days <= 365) return "buried";
  return "ancient";
}

export function classifyRepo(
  repo: Pick<Repo, "pushedAt" | "createdAt" | "archived">,
  now: Date,
): { status: RepoStatus; inactiveDays: number; usedCreatedDate: boolean } {
  const usedCreatedDate = repo.pushedAt === null;
  const inactiveDays = calendarDaysSince(repo.pushedAt ?? repo.createdAt, now);
  return {
    status: repo.archived ? "archived" : statusForDays(inactiveDays),
    inactiveDays,
    usedCreatedDate,
  };
}

export const STATUS_LABELS: Record<RepoStatus, string> = {
  alive: "Alive",
  forgotten: "Forgotten",
  buried: "Buried",
  ancient: "Ancient",
  archived: "Archived",
};

export const STATUS_COLORS: Record<RepoStatus, string> = {
  alive: "#55D68A",
  forgotten: "#E8B45A",
  buried: "#D8C8A3",
  ancient: "#9C8FB5",
  archived: "#C8D8FF",
};

export const STATUS_ORDER: RepoStatus[] = ["alive", "forgotten", "buried", "ancient", "archived"];

export function formatInactivity(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days.toLocaleString("en-US")} days ago`;
}
