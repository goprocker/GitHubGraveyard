"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute } from "three";

import { useGraveyard } from "@/lib/store";
import type { CemeteryLayout, EnrichedRepo, RepoStatus } from "@/lib/types";

const VERTEX = /* glsl */ `
  attribute vec3 glow;
  attribute float size;
  varying vec3 vGlow;
  void main() {
    vGlow = glow;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(size * 340.0 / -view.z, 2.0, 220.0);
    gl_Position = projectionMatrix * view;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float falloff = pow(max(0.0, 1.0 - d), 2.4);
    gl_FragColor = vec4(vGlow * falloff, falloff);
  }
`;

// Side and forward offsets match the accessories placed in Scenery.
const GLOWS: Partial<Record<RepoStatus, { color: string; side: number; forward: number; y: number; size: number; strength: number }>> = {
  alive: { color: "#55D68A", side: 0, forward: 0.6, y: 0.35, size: 2.4, strength: 0.42 },
  forgotten: { color: "#E8B45A", side: 0.56, forward: 0.62, y: 0.32, size: 2.6, strength: 0.9 },
  ancient: { color: "#7E5FB0", side: 0, forward: 0.2, y: 0.9, size: 3.2, strength: 0.26 },
  archived: { color: "#C8D8FF", side: 0, forward: 0.1, y: 1.2, size: 3.4, strength: 0.34 },
};

const UNIFORMS = {};

/** Soft status lights as a single point cloud, far cheaper than one light per grave. */
export function GraveGlows({ layout, repos }: { layout: CemeteryLayout; repos: readonly EnrichedRepo[] }) {
  const repaired = useGraveyard((state) => state.resurrectedIds);

  const geometry = useMemo(() => {
    const statusById = new Map(repos.map((repo) => [repo.id, repo.status]));
    const positions: number[] = [];
    const glows: number[] = [];
    const sizes: number[] = [];
    const color = new Color();
    for (const grave of layout.graves) {
      const status = repaired.has(grave.id) ? "alive" : statusById.get(grave.id);
      const glow = status ? GLOWS[status] : undefined;
      if (!glow) continue;
      const sin = Math.sin(grave.rotationY);
      const cos = Math.cos(grave.rotationY);
      positions.push(
        grave.x + glow.side * cos + glow.forward * sin,
        grave.y + glow.y,
        grave.z - glow.side * sin + glow.forward * cos,
      );
      color.set(glow.color).multiplyScalar(glow.strength);
      glows.push(color.r, color.g, color.b);
      sizes.push(glow.size);
    }
    const built = new BufferGeometry();
    built.setAttribute("position", new Float32BufferAttribute(positions, 3));
    built.setAttribute("glow", new Float32BufferAttribute(glows, 3));
    built.setAttribute("size", new Float32BufferAttribute(sizes, 1));
    return built;
  }, [layout, repos, repaired]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry} frustumCulled={false} raycast={() => null} renderOrder={7}>
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={UNIFORMS}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
