"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { type BufferGeometry, Euler, type InstancedMesh, type Material, Matrix4, Quaternion, Vector3 } from "three";

import { useGraveyard } from "@/lib/store";
import type { EnrichedRepo, GravePlacement } from "@/lib/types";

import { LABEL_ASPECT } from "./LabelAtlas";
import { MAX_TILT, STAR_COUNT } from "./Tombstone";
import type { GraveShape } from "./TombstoneGeometries";

const STAR_SPACING = 0.24;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export interface StarredGrave {
  repo: EnrichedRepo;
  grave: GravePlacement;
  shape: GraveShape;
}

interface GraveStarsProps {
  graves: readonly StarredGrave[];
  geometry: BufferGeometry;
  material: Material;
}

/** One instanced mesh for every star. They don't follow the small hover lift, which is barely visible. */
export function GraveStars({ graves, geometry, material }: GraveStarsProps) {
  const ref = useRef<InstancedMesh>(null);
  const repaired = useGraveyard((state) => state.resurrectedIds);
  const matching = useGraveyard((state) => state.matchingIds);
  const count = useMemo(() => graves.reduce((sum, { repo }) => sum + STAR_COUNT[repo.tier], 0), [graves]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const parent = new Matrix4();
    const tilt = new Matrix4();
    const local = new Matrix4();
    const quaternion = new Quaternion();
    let index = 0;
    for (const { repo, grave, shape } of graves) {
      const stars = STAR_COUNT[repo.tier];
      const dimmed = matching !== null && !matching.has(repo.id);
      const lean = repaired.has(repo.id) ? 0 : MAX_TILT[repo.status];
      quaternion.setFromEuler(new Euler(0, grave.rotationY, 0));
      parent.compose(
        new Vector3(grave.x, grave.y, grave.z),
        quaternion,
        new Vector3(grave.scale, grave.scale, grave.scale),
      );
      tilt.makeRotationFromEuler(new Euler(grave.tiltX * lean, 0, grave.tiltZ * lean));
      const y = shape.labelY + (shape.labelWidth * LABEL_ASPECT) / 2 + 0.16;
      for (let star = 0; star < stars; star++) {
        local.makeTranslation((star - (stars - 1) / 2) * STAR_SPACING, y, shape.faceZ - 0.012);
        mesh.setMatrixAt(index++, dimmed ? HIDDEN : local.premultiply(tilt).premultiply(parent));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [graves, repaired, matching]);

  if (count === 0) return null;
  return <instancedMesh key={count} ref={ref} args={[geometry, material, count]} raycast={() => null} />;
}
