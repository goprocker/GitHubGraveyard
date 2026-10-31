import type { GraveyardResponse, Repo } from "./types";

const MS_PER_DAY = 86_400_000;

interface DemoEntry {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedDaysAgo: number;
  ageDays: number;
  archived?: boolean;
  fork?: boolean;
}

// Invented repositories. The UI labels this data as a demo everywhere it appears.
const ENTRIES: DemoEntry[] = [
  { name: "todo-app-final-v3", description: "A to-do app. The third and final one.", language: "TypeScript", stars: 2, forks: 0, pushedDaysAgo: 412, ageDays: 900 },
  { name: "my-startup-idea", description: "Uber, but for houseplants.", language: "JavaScript", stars: 0, forks: 0, pushedDaysAgo: 803, ageDays: 830 },
  { name: "dotfiles", description: "Configuration files, always one tweak from perfect.", language: "Shell", stars: 14, forks: 3, pushedDaysAgo: 4, ageDays: 2100 },
  { name: "rust-rewrite", description: "Rewriting it in Rust.", language: "Rust", stars: 31, forks: 2, pushedDaysAgo: 188, ageDays: 240 },
  { name: "blog-engine", description: "A blog engine with one post about building a blog engine.", language: "Go", stars: 8, forks: 1, pushedDaysAgo: 540, ageDays: 1100 },
  { name: "ml-stock-predictor", description: "Predicts stock prices using a notebook and optimism.", language: "Jupyter Notebook", stars: 123, forks: 29, pushedDaysAgo: 1006, ageDays: 1200 },
  { name: "game-of-life", description: "Conway's Game of Life in the browser.", language: "JavaScript", stars: 6, forks: 0, pushedDaysAgo: 73, ageDays: 400 },
  { name: "side-project-2", description: "Whatever happened to side-project-1?", language: "Python", stars: 1, forks: 0, pushedDaysAgo: 299, ageDays: 330 },
  { name: "css-only-everything", description: "Things that should not be built with only CSS.", language: "CSS", stars: 212, forks: 18, pushedDaysAgo: 22, ageDays: 1500 },
  { name: "old-portfolio", description: "Portfolio site, retired and preserved.", language: "HTML", stars: 3, forks: 1, pushedDaysAgo: 1400, ageDays: 2300, archived: true },
  { name: "chat-server", description: "A small chat server over WebSockets.", language: "Java", stars: 27, forks: 11, pushedDaysAgo: 650, ageDays: 1800, archived: true },
  { name: "weekend-raytracer", description: "A ray tracer, one sphere so far.", language: "C++", stars: 44, forks: 4, pushedDaysAgo: 130, ageDays: 150 },
  { name: "budget-tracker", description: "Tracks a budget that no longer exists.", language: "Kotlin", stars: 0, forks: 0, pushedDaysAgo: 61, ageDays: 95 },
  { name: "advent-of-code", description: "Solutions through day nine, every year.", language: "Python", stars: 9, forks: 1, pushedDaysAgo: 340, ageDays: 1700 },
  { name: "lua-roguelike", description: "A dungeon crawler with one very long corridor.", language: "Lua", stars: 17, forks: 2, pushedDaysAgo: 720, ageDays: 960 },
  { name: "notes-cli", description: "Take notes from the terminal.", language: "Rust", stars: 0, forks: 0, pushedDaysAgo: 12, ageDays: 60 },
  { name: "resume", description: null, language: "HTML", stars: 0, forks: 0, pushedDaysAgo: 28, ageDays: 1300 },
  { name: "swift-habit-app", description: "Build a habit of opening this repo.", language: "Swift", stars: 5, forks: 0, pushedDaysAgo: 88, ageDays: 210 },
  { name: "php-guestbook", description: "Sign the guestbook.", language: "PHP", stars: 2, forks: 1, pushedDaysAgo: 2011, ageDays: 2800 },
  { name: "tiny-compiler", description: "A compiler for a language with one user.", language: "C", stars: 67, forks: 6, pushedDaysAgo: 455, ageDays: 700 },
  { name: "react-boilerplate-fork", description: "A personal copy of a starter template.", language: "TypeScript", stars: 0, forks: 0, pushedDaysAgo: 950, ageDays: 960, fork: true },
];

/** Dates are relative to now so the demo always shows every status. */
export function buildDemoRepos(now: Date): Repo[] {
  const daysAgo = (days: number) => new Date(now.getTime() - days * MS_PER_DAY).toISOString();
  return ENTRIES.map((entry, index) => ({
    id: 1000 + index,
    name: entry.name,
    description: entry.description,
    htmlUrl: null,
    language: entry.language,
    stars: entry.stars,
    forks: entry.forks,
    createdAt: daysAgo(entry.ageDays),
    updatedAt: daysAgo(entry.pushedDaysAgo),
    pushedAt: daysAgo(entry.pushedDaysAgo),
    archived: entry.archived ?? false,
    fork: entry.fork ?? false,
  }));
}

export function buildDemoResponse(now: Date, includeForks: boolean): GraveyardResponse {
  const repos = buildDemoRepos(now);
  return {
    username: "demo",
    repos: includeForks ? repos : repos.filter((repo) => !repo.fork),
    forkCount: repos.filter((repo) => repo.fork).length,
    includeForks,
    truncated: false,
    fetchedAt: now.toISOString(),
    stale: false,
  };
}
