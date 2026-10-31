import { hashString } from "./seed";
import type { RepoStatus } from "./types";

// These stay as gentle jokes. None of them claims anything factual about a repository.
const EPITAPHS: Record<RepoStatus, readonly string[]> = {
  alive: [
    "Not dead yet. Keep walking.",
    "Still breathing. Visit again soon.",
    "The groundskeeper checks on this one daily.",
    "Reserved, but not needed today.",
    "Rumors of this grave are premature.",
  ],
  forgotten: [
    "The developer promised to return.",
    "Back in five minutes, it said.",
    "Just resting between commits.",
    "Gone for a short walk.",
    "Somebody left the lantern on.",
  ],
  buried: [
    "Here lies another weekend project.",
    "Last seen in a README.",
    "Built with passion. Forgotten by Monday.",
    "One commit away from greatness.",
    "It had such big plans.",
    "Survived by a long list of TODOs.",
  ],
  ancient: [
    "Older than your current framework.",
    "From a time before this tab was opened.",
    "The moss has seniority here.",
    "Even the ghosts have moved on.",
    "Remembered fondly, if at all.",
    "Dust to dust. Branch to branch.",
  ],
  archived: [
    "Laid to rest with honors.",
    "Read-only, at last.",
    "Sealed by a steady hand.",
    "Finished its watch.",
    "At peace, and write-protected.",
  ],
};

export function epitaphFor(repoId: number, status: RepoStatus): string {
  const pool = EPITAPHS[status];
  return pool[hashString(`epitaph:${repoId}`) % pool.length] as string;
}

export function allEpitaphs(): readonly string[] {
  return Object.values(EPITAPHS).flat();
}
