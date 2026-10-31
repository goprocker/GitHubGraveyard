"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, type ShaderMaterial } from "three";

import { prefersReducedMotion } from "@/lib/quality";
import { createRandom } from "@/lib/seed";
import { terrainHeight } from "@/lib/terrain";
import type { CemeteryLayout } from "@/lib/types";

const VERTEX = /* glsl */ `
  attribute float phase;
  uniform float uTime;
  varying float vGlow;
  void main() {
    vec3 moved = position + vec3(
      sin(uTime * 0.31 + phase * 7.0) * 1.3,
      sin(uTime * 0.47 + phase * 11.0) * 0.5,
      cos(uTime * 0.27 + phase * 5.0) * 1.3
    );
    vGlow = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 0.9 + phase * 19.0), 3.0);
    vec4 view = modelViewMatrix * vec4(moved, 1.0);
    gl_PointSize = clamp(90.0 / -view.z, 1.5, 14.0);
    gl_Position = projectionMatrix * view;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    gl_FragColor = vec4(vec3(0.72, 0.95, 0.72), smoothstep(1.0, 0.0, d) * vGlow);
  }
`;

export function Particles({ layout, count }: { layout: CemeteryLayout; count: number }) {
  const material = useRef<ShaderMaterial>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const uniforms = useMemo(() => ({ uTime: { value: 4 } }), []);

  const geometry = useMemo(() => {
    const random = createRandom(611);
    const positions: number[] = [];
    const phases: number[] = [];
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * (layout.radius + 8);
      const x = layout.center.x + Math.cos(angle) * distance;
      const z = layout.center.z + Math.sin(angle) * distance;
      positions.push(x, terrainHeight(x, z) + 0.6 + random() * 3, z);
      phases.push(random());
    }
    const built = new BufferGeometry();
    built.setAttribute("position", new Float32BufferAttribute(positions, 3));
    built.setAttribute("phase", new Float32BufferAttribute(phases, 1));
    return built;
  }, [layout, count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!reduced && material.current) {
      (material.current.uniforms.uTime as { value: number }).value += delta;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false} raycast={() => null}>
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
