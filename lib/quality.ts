export type QualityLevel = "high" | "low";

export interface QualitySettings {
  fogSheets: number;
  trees: number;
  rocks: number;
  grass: number;
  particles: number;
  atlasWidth: number;
  atlasHeight: number;
  maxDpr: number;
  shadows: boolean;
  graveDetails: boolean;
}

export const QUALITY: Record<QualityLevel, QualitySettings> = {
  high: {
    fogSheets: 6,
    trees: 42,
    rocks: 110,
    grass: 420,
    particles: 120,
    atlasWidth: 4096,
    atlasHeight: 2048,
    maxDpr: 2,
    shadows: true,
    graveDetails: true,
  },
  low: {
    fogSheets: 3,
    trees: 18,
    rocks: 40,
    grass: 120,
    particles: 40,
    atlasWidth: 2048,
    atlasHeight: 1024,
    maxDpr: 1.5,
    shadows: false,
    graveDetails: false,
  },
};

const STORAGE_KEY = "graveyard-quality";

export function isMobileDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
}

export function initialQuality(): QualityLevel {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "high" || saved === "low") return saved;
  } catch {
    // Storage can be blocked. Fall through to detection.
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  return isMobileDevice() || cores <= 2 ? "low" : "high";
}

export function saveQuality(level: QualityLevel): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, level);
  } catch {
    // The choice still applies for this visit.
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
