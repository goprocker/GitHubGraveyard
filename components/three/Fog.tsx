"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, DoubleSide, type Group, type InstancedMesh, Object3D, type Vector3Tuple } from "three";

import { prefersReducedMotion } from "@/lib/quality";
import { createRandom } from "@/lib/seed";
import { terrainHeight } from "@/lib/terrain";
import type { CemeteryLayout, EnrichedRepo, RepoStatus } from "@/lib/types";

const PATCH_SCALE: Record<RepoStatus, number> = {
  alive: 0,
  forgotten: 4,
  buried: 6.5,
  ancient: 9,
  archived: 4.5,
};

function fogTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const random = createRandom(53);
  for (let i = 0; i < 70; i++) {
    const radius = 18 + random() * 44;
    const distance = random() * (size / 2 - radius);
    const angle = random() * Math.PI * 2;
    const x = size / 2 + Math.cos(angle) * distance;
    const y = size / 2 + Math.sin(angle) * distance;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.13)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  return new CanvasTexture(canvas);
}

interface FogProps {
  layout: CemeteryLayout;
  repos: readonly EnrichedRepo[];
  sheets: number;
}

export function Fog({ layout, repos, sheets }: FogProps) {
  const texture = useMemo(() => fogTexture(), []);
  const sheetsRef = useRef<Group>(null);
  const patchesRef = useRef<InstancedMesh>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const placements = useMemo(() => {
    const random = createRandom(77);
    const size = layout.radius * 2.6 + 40;
    return Array.from({ length: sheets }, () => ({
      position: [
        layout.center.x + (random() - 0.5) * 30,
        0.9 + random() * 2.2,
        layout.center.z + (random() - 0.5) * 30,
      ] as Vector3Tuple,
      size,
      rotation: random() * Math.PI * 2,
      speed: (random() - 0.5) * 0.024,
    }));
  }, [layout, sheets]);

  const patched = useMemo(() => {
    const byId = new Map(repos.map((repo) => [repo.id, repo.status]));
    return layout.graves.flatMap((grave) => {
      const status = byId.get(grave.id);
      return status && PATCH_SCALE[status] > 0 ? [{ grave, scale: PATCH_SCALE[status] }] : [];
    });
  }, [layout, repos]);

  useLayoutEffect(() => {
    const mesh = patchesRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    patched.forEach(({ grave, scale }, index) => {
      dummy.position.set(grave.x, terrainHeight(grave.x, grave.z) + 0.45, grave.z);
      dummy.rotation.set(-Math.PI / 2, 0, grave.seed % 7);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [patched]);

  useFrame((_, delta) => {
    if (reduced || !sheetsRef.current) return;
    sheetsRef.current.children.forEach((sheet, index) => {
      sheet.rotation.z += (placements[index]?.speed ?? 0) * delta;
    });
  });

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <group ref={sheetsRef}>
        {placements.map((sheet, index) => (
          <mesh
            key={index}
            position={sheet.position}
            rotation={[-Math.PI / 2, 0, sheet.rotation]}
            raycast={() => null}
            renderOrder={5}
          >
            <planeGeometry args={[sheet.size, sheet.size]} />
            <meshBasicMaterial
              map={texture}
              color="#AEBBE0"
              transparent
              opacity={0.17}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>
      {patched.length > 0 && (
        <instancedMesh
          key={patched.length}
          ref={patchesRef}
          args={[undefined, undefined, patched.length]}
          raycast={() => null}
          renderOrder={6}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={texture}
            color="#BAC6E6"
            transparent
            opacity={0.24}
            depthWrite={false}
            side={DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
}
