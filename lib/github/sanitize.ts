import type { Repo } from "../types";

const MAX_DESCRIPTION = 300;
const MAX_NAME = 100;
const MAX_LANGUAGE = 40;

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function safeGitHubUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://github.com/") ? value : null;
}

/** Copies only the known fields. Returns null for an entry missing required data. */
export function sanitizeRepo(raw: unknown): Repo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as Record<string, unknown>;

  if (typeof source.id !== "number" || !Number.isSafeInteger(source.id)) return null;
  if (typeof source.name !== "string" || source.name.length === 0) return null;
  if (!isDate(source.created_at)) return null;

  return {
    id: source.id,
    name: source.name.slice(0, MAX_NAME),
    description:
      typeof source.description === "string" ? source.description.slice(0, MAX_DESCRIPTION) : null,
    htmlUrl: safeGitHubUrl(source.html_url),
    language: typeof source.language === "string" ? source.language.slice(0, MAX_LANGUAGE) : null,
    stars: count(source.stargazers_count),
    forks: count(source.forks_count),
    createdAt: source.created_at,
    updatedAt: isDate(source.updated_at) ? source.updated_at : source.created_at,
    pushedAt: isDate(source.pushed_at) ? source.pushed_at : null,
    archived: source.archived === true,
    fork: source.fork === true,
    // Unknown visibility counts as private, the safer label.
    private: source.private !== false,
  };
}
