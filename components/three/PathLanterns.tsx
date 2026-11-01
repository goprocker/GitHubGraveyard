"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  type InstancedMesh,
  Object3D,
  type PointsMaterial,
} from "three";

import { prefersReducedMotion } from "@/lib/quality";
import { GATE_Z, PATH_HALF_WIDTH, pathX, terrainHeight } from "@/lib/terrain";
import type { CemeteryLayout } from "@/lib/types";

const SPACING = 9;
const POST_HEIGHT = 1.9;

function glowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,214,140,0.95)");
  gradient.addColorStop(0.25, "rgba(240,170,80,0.35)");
  gradient.addColorStop(1, "rgba(240,170,80,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** Lantern posts lining the path: the warm light the cold scene is built around. */
export function PathLanterns({ layout }: { layout: CemeteryLayout }) {
  const posts = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const glowMaterial = useRef<PointsMaterial>(null);
  const texture = useMemo(() => glowTexture(), []);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const spots = useMemo(() => {
    const result: { x: number; y: number; z: number }[] = [];
    const start = GATE_Z - 5;
    const end = layout.bounds.minZ - 2;
    for (let z = start, index = 0; z > end; z -= SPACING, index++) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = pathX(z) + side * (PATH_HALF_WIDTH + 0.9);
      result.push({ x, y: terrainHeight(x, z), z });
    }
    return result;
  }, [layout]);

  const glow = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(spots.flatMap((spot) => [spot.x, spot.y + POST_HEIGHT, spot.z]), 3),
    );
    return geometry;
  }, [spots]);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    spots.forEach((spot, index) => {
      dummy.position.set(spot.x, spot.y + POST_HEIGHT / 2, spot.z);
      dummy.updateMatrix();
      posts.current?.setMatrixAt(index, dummy.matrix);
      dummy.position.set(spot.x, spot.y + POST_HEIGHT, spot.z);
      dummy.updateMatrix();
      lamps.current?.setMatrixAt(index, dummy.matrix);
    });
    for (const mesh of [posts.current, lamps.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
  }, [spots]);

  useEffect(
    () => () => {
      texture.dispose();
      glow.dispose();
    },
    [texture, glow],
  );

  useFrame(({ clock }) => {
    if (reduced || !glowMaterial.current) return;
    const t = clock.elapsedTime;
    glowMaterial.current.size = 6 + Math.sin(t * 7) * 0.35 + Math.sin(t * 17) * 0.25;
  });

  if (spots.length === 0) return null;

  return (
    <group>
      <instancedMesh key={`p${spots.length}`} ref={posts} args={[undefined, undefined, spots.length]} raycast={() => null}>
        <cylinderGeometry args={[0.05, 0.08, POST_HEIGHT, 6]} />
        <meshStandardMaterial color="#14182b" roughness={0.8} />
      </instancedMesh>
      <instancedMesh key={`l${spots.length}`} ref={lamps} args={[undefined, undefined, spots.length]} raycast={() => null}>
        <boxGeometry args={[0.26, 0.34, 0.26]} />
        <meshBasicMaterial color="#ffd08a" toneMapped={false} />
      </instancedMesh>
      <points geometry={glow} frustumCulled={false} raycast={() => null} renderOrder={8}>
        <pointsMaterial
          ref={glowMaterial}
          map={texture}
          size={6}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
