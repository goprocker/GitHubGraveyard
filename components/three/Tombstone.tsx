"use client";

import type { ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import { memo, useEffect, useRef } from "react";
import type { BufferGeometry, Group, Material } from "three";

import { prefersReducedMotion } from "@/lib/quality";
import { useGraveyard } from "@/lib/store";
import type { EnrichedRepo, GravePlacement, RepoStatus } from "@/lib/types";

import type { GraveMaterials, GraveShape } from "./TombstoneGeometries";

export const MAX_TILT: Record<RepoStatus, number> = {
  alive: 0.008,
  forgotten: 0.025,
  buried: 0.07,
  ancient: 0.14,
  archived: 0,
};

export const STAR_COUNT = { basic: 0, decorative: 1, elaborate: 2, monument: 3 } as const;
const HOVER_LIFT = 0.09;
const DRAG_THRESHOLD_PX = 5;

interface TombstoneProps {
  repo: EnrichedRepo;
  grave: GravePlacement;
  shape: GraveShape;
  materials: GraveMaterials;
  labelGeometry: BufferGeometry;
  labelMaterial: Material;
  dimLabelMaterial: Material;
  castShadow: boolean;
}

function TombstoneImpl({
  repo,
  grave,
  shape,
  materials,
  labelGeometry,
  labelMaterial,
  dimLabelMaterial,
  castShadow,
}: TombstoneProps) {
  // Each selector returns a boolean, so hovering rerenders only the graves that change.
  const hovered = useGraveyard((state) => state.hoveredId === repo.id);
  const selected = useGraveyard((state) => state.selectedId === repo.id);
  const dimmed = useGraveyard((state) => state.matchingIds !== null && !state.matchingIds.has(repo.id));
  const repaired = useGraveyard((state) => state.resurrectedIds.has(repo.id));

  const liftRef = useRef<Group>(null);
  const tiltRef = useRef<Group>(null);
  const tilt = MAX_TILT[repo.status];

  useEffect(() => {
    const lift = liftRef.current;
    if (!lift) return;
    const y = hovered || selected ? HOVER_LIFT : 0;
    if (prefersReducedMotion()) {
      lift.position.y = y;
      return;
    }
    const tween = gsap.to(lift.position, { y, duration: 0.25, ease: "power2.out" });
    return () => {
      tween.kill();
    };
  }, [hovered, selected]);

  useEffect(() => {
    const group = tiltRef.current;
    if (!group || !repaired) return;
    const tween = gsap.to(group.rotation, {
      x: 0,
      z: 0,
      duration: prefersReducedMotion() ? 0 : 0.7,
      ease: "back.out(1.4)",
    });
    return () => {
      tween.kill();
    };
  }, [repaired]);

  // Clears any leftover hover if the grave unmounts under the pointer.
  useEffect(() => {
    const { id } = repo;
    return () => {
      if (useGraveyard.getState().hoveredId === id) {
        useGraveyard.getState().setHovered(null);
        document.body.style.cursor = "";
      }
    };
  }, [repo]);

  const onPointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (useGraveyard.getState().introActive) return;
    useGraveyard.getState().setHovered(repo.id);
    document.body.style.cursor = "pointer";
  };

  const onPointerOut = () => {
    if (useGraveyard.getState().hoveredId === repo.id) useGraveyard.getState().setHovered(null);
    document.body.style.cursor = "";
  };

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > DRAG_THRESHOLD_PX || useGraveyard.getState().introActive) return;
    useGraveyard.getState().select(repo.id);
  };

  const stone = materials.stone[repaired ? "alive" : repo.status];
  const stoneMaterial = selected
    ? stone.selected
    : hovered
      ? stone.hover
      : dimmed
        ? stone.dim
        : stone.base;

  return (
    <group
      position={[grave.x, grave.y, grave.z]}
      rotation={[0, grave.rotationY, 0]}
      scale={grave.scale}
    >
      <group ref={liftRef}>
        <group ref={tiltRef} rotation={[grave.tiltX * tilt, 0, grave.tiltZ * tilt]}>
          <mesh
            geometry={shape.geometry}
            material={stoneMaterial}
            castShadow={castShadow}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onClick={onClick}
          />
          <mesh
            geometry={labelGeometry}
            material={dimmed ? dimLabelMaterial : labelMaterial}
            position={[0, shape.labelY, shape.faceZ]}
            scale={shape.labelWidth}
            raycast={() => null}
          />
        </group>
      </group>
    </group>
  );
}

export const Tombstone = memo(TombstoneImpl);
