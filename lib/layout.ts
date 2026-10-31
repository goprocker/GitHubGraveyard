import { prestigeForStars, TIER_RANK } from "./prestige";
import { createRandom, hashString, range, shuffled, type Random } from "./seed";
import { distanceToPath, GATE_Z, PATH_HALF_WIDTH, pathX, terrainHeight } from "./terrain";
import type { CemeteryLayout, GravePlacement, Repo, ScatterItem, Scenery } from "./types";

export const CELL_SIZE = 5.4;
/** Largest distance a grave's geometry extends from its origin. */
export const GRAVE_FOOTPRINT = 1.7;

const MAX_JITTER = CELL_SIZE / 2 - GRAVE_FOOTPRINT;
const PATH_CLEARANCE = 1.2;
const FIRST_ROW_Z = GATE_Z - 8;

interface Slot {
  x: number;
  z: number;
  rank: number;
}

function buildSlots(count: number, random: Random): Slot[] {
  const rows = Math.max(3, Math.ceil(Math.sqrt(count * 0.9)));
  const columnsPerSide = Math.max(1, Math.ceil(count / (2 * rows)));
  const slots: Slot[] = [];

  for (let row = 0; row < rows; row++) {
    const z = FIRST_ROW_Z - row * CELL_SIZE;
    for (let column = 0; column < columnsPerSide; column++) {
      const offset = PATH_HALF_WIDTH + PATH_CLEARANCE + CELL_SIZE * (column + 0.5);
      for (const side of [-1, 1]) {
        slots.push({
          x: pathX(z) + side * offset,
          z,
          // Near the path comes first, with enough noise to avoid visible rings.
          rank: column * 2 + row * 0.35 + random() * 0.8,
        });
      }
    }
  }
  return slots.sort((a, b) => a.rank - b.rank);
}

/** The same username and repository set always produce the same layout, in any input order. */
export function generateLayout(
  username: string,
  repos: readonly Pick<Repo, "id" | "stars">[],
): CemeteryLayout {
  const sorted = [...repos].sort((a, b) => a.id - b.id);
  const seed = hashString(`${username.toLowerCase()}:${sorted.map((repo) => repo.id).join(",")}`);
  const random = createRandom(seed);

  const slots = buildSlots(sorted.length, random);

  // Shuffle first so graves of equal prestige do not line up by ID.
  const ordered = shuffled(sorted, random).sort(
    (a, b) => TIER_RANK[prestigeForStars(b.stars)] - TIER_RANK[prestigeForStars(a.stars)],
  );

  const graves: GravePlacement[] = ordered.map((repo, index) => {
    const slot = slots[index] as Slot;
    const graveRandom = createRandom(hashString(`${seed}:${repo.id}`));
    const x = slot.x + range(graveRandom, -MAX_JITTER, MAX_JITTER);
    const z = slot.z + range(graveRandom, -MAX_JITTER, MAX_JITTER);
    return {
      id: repo.id,
      x,
      y: terrainHeight(x, z),
      z,
      rotationY: range(graveRandom, -0.28, 0.28),
      tiltX: range(graveRandom, -1, 1),
      tiltZ: range(graveRandom, -1, 1),
      scale: range(graveRandom, 0.92, 1.1),
      variant: Math.floor(graveRandom() * 3),
      seed: Math.floor(graveRandom() * 0xffffffff),
    };
  });

  const xs = graves.map((grave) => grave.x);
  const zs = graves.map((grave) => grave.z);
  const bounds = {
    minX: Math.min(-8, ...xs),
    maxX: Math.max(8, ...xs),
    minZ: Math.min(FIRST_ROW_Z - CELL_SIZE * 2, ...zs),
    maxZ: Math.max(FIRST_ROW_Z, ...zs),
  };
  const center = { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  const radius = Math.max(
    12,
    ...graves.map((grave) => Math.hypot(grave.x - center.x, grave.z - center.z) + GRAVE_FOOTPRINT),
  );

  return { graves, bounds, center, radius };
}

interface SceneryCounts {
  trees: number;
  rocks: number;
  grass: number;
}

/** Places scenery around the graves, keeping the graves and the path clear. */
export function generateScenery(layout: CemeteryLayout, counts: SceneryCounts, seed: number): Scenery {
  const random = createRandom(seed);
  const spread = layout.radius + 22;

  const isClear = (x: number, z: number, clearance: number): boolean => {
    if (distanceToPath(x, z) < PATH_HALF_WIDTH + clearance) return false;
    if (z > GATE_Z - 3 && Math.abs(x) < 9) return false;
    return layout.graves.every(
      (grave) => Math.hypot(grave.x - x, grave.z - z) >= GRAVE_FOOTPRINT + clearance,
    );
  };

  const scatter = (
    count: number,
    clearance: number,
    reach: number,
    scaleMin: number,
    scaleMax: number,
    variants: number,
  ): ScatterItem[] => {
    const items: ScatterItem[] = [];
    for (let attempt = 0; attempt < count * 12 && items.length < count; attempt++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * reach;
      const x = layout.center.x + Math.cos(angle) * distance;
      const z = layout.center.z + Math.sin(angle) * distance;
      if (!isClear(x, z, clearance)) continue;
      items.push({
        x,
        y: terrainHeight(x, z),
        z,
        rotationY: random() * Math.PI * 2,
        scale: range(random, scaleMin, scaleMax),
        variant: Math.floor(random() * variants),
      });
    }
    return items;
  };

  return {
    trees: scatter(counts.trees, 2.6, spread, 0.8, 1.5, 3),
    rocks: scatter(counts.rocks, 0.7, spread, 0.25, 0.95, 2),
    grass: scatter(counts.grass, 0.3, layout.radius + 6, 0.6, 1.3, 1),
  };
}
