import type { PrestigeTier } from "./types";

export function prestigeForStars(stars: number): PrestigeTier {
  if (stars >= 100) return "monument";
  if (stars >= 20) return "elaborate";
  if (stars >= 5) return "decorative";
  return "basic";
}

export const TIER_LABELS: Record<PrestigeTier, string> = {
  basic: "Gravestone",
  decorative: "Decorative gravestone",
  elaborate: "Elaborate memorial",
  monument: "Monument",
};

export const TIER_RANK: Record<PrestigeTier, number> = {
  basic: 0,
  decorative: 1,
  elaborate: 2,
  monument: 3,
};
