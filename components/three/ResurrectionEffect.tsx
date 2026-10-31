"use client";

import { Billboard } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Group,
  type MeshBasicMaterial,
  type PointLight,
  type Texture,
} from "three";

import { prefersReducedMotion } from "@/lib/quality";
import { createRandom } from "@/lib/seed";
import { useGraveyard } from "@/lib/store";
import { RESURRECTION } from "@/lib/timelines";
import type { CemeteryLayout } from "@/lib/types";

import { AMBIENT_INTENSITY, KEY_INTENSITY, type SceneState } from "./sceneState";

const GHOST_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A hooded shape with a brighter edge, which reads as a fresnel rim on a flat billboard.
const GHOST_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - vec2(0.5, 0.0)) * vec2(2.0, 1.0);
    float width = 0.72 * sqrt(clamp(1.0 - pow(p.y, 2.6), 0.0, 1.0));
    float edge = abs(p.x) / max(width, 0.001);
    float body = smoothstep(1.0, 0.72, edge);
    float rim = smoothstep(0.35, 0.95, edge) * body;
    float fade = smoothstep(0.0, 0.3, p.y);
    gl_FragColor = vec4(vec3(0.55, 0.95, 0.8), (body * 0.28 + rim * 0.75) * fade * uOpacity);
  }
`;

const SPARK_VERTEX = /* glsl */ `
  attribute vec3 direction;
  uniform float uProgress;
  void main() {
    vec3 moved = direction * uProgress;
    moved.y -= uProgress * uProgress * 0.8;
    vec4 view = modelViewMatrix * vec4(moved, 1.0);
    gl_PointSize = clamp(70.0 / -view.z, 2.0, 12.0);
    gl_Position = projectionMatrix * view;
  }
`;

const SPARK_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    gl_FragColor = vec4(0.33, 0.84, 0.54, smoothstep(1.0, 0.1, d) * uOpacity);
  }
`;

interface ResurrectionEffectProps {
  layout: CemeteryLayout;
  crackTexture: Texture;
  scene: SceneState;
}

export function ResurrectionEffect({ layout, crackTexture, scene }: ResurrectionEffectProps) {
  const resurrectingId = useGraveyard((state) => state.resurrectingId);
  const group = useRef<Group>(null);
  const ghostHolder = useRef<Group>(null);
  const crack = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const ghostUniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);
  const sparkUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uProgress: { value: 0 } }), []);

  const sparks = useMemo(() => {
    const random = createRandom(733);
    const directions: number[] = [];
    for (let i = 0; i < 70; i++) {
      directions.push((random() - 0.5) * 3.4, 0.6 + random() * 3, (random() - 0.5) * 3.4);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("direction", new Float32BufferAttribute(directions, 3));
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(70 * 3), 3));
    return geometry;
  }, []);

  useEffect(() => () => sparks.dispose(), [sparks]);

  useEffect(() => {
    if (resurrectingId === null) return;
    const grave = layout.graves.find((candidate) => candidate.id === resurrectingId);
    const holder = group.current;
    const ghost = ghostHolder.current;
    const crackMaterial = crack.current;
    const pointLight = light.current;
    const ambient = scene.ambient.current;
    const key = scene.keyLight.current;
    const store = useGraveyard.getState();
    if (!grave || !holder || !ghost || !crackMaterial || !pointLight || !ambient || !key) {
      store.finishResurrection();
      return;
    }

    holder.position.set(grave.x, grave.y, grave.z);
    holder.rotation.y = grave.rotationY;
    holder.visible = true;
    ghost.position.y = 0.2;
    ghostUniforms.uOpacity.value = 0;
    sparkUniforms.uOpacity.value = 0;
    sparkUniforms.uProgress.value = 0;
    crackMaterial.opacity = 0;
    pointLight.intensity = 0;

    const t = RESURRECTION;
    const timeline = gsap.timeline({
      onComplete: () => useGraveyard.getState().finishResurrection(),
    });

    timeline.to(ambient, { intensity: AMBIENT_INTENSITY * 0.35, duration: 0.4 }, t.dim);
    timeline.to(key, { intensity: KEY_INTENSITY * 0.3, duration: 0.4 }, t.dim);

    // A single flash that never strobes, and none at all for reduced motion.
    if (!prefersReducedMotion()) {
      timeline.to(key, { intensity: KEY_INTENSITY * 3.2, duration: 0.07 }, t.lightning);
      timeline.to(key, { intensity: KEY_INTENSITY * 0.3, duration: 0.4 }, t.lightning + 0.07);
    }

    timeline.to(crackMaterial, { opacity: 1, duration: 0.5 }, t.cracks);
    timeline.to(pointLight, { intensity: 16, duration: 0.5 }, t.cracks);

    timeline.to(ghostUniforms.uOpacity, { value: 1, duration: 0.4 }, t.ghost);
    timeline.to(ghost.position, { y: 2.2, duration: 1.3, ease: "sine.out" }, t.ghost);
    timeline.to(ghostUniforms.uOpacity, { value: 0, duration: 0.5 }, t.bloom - 0.1);

    timeline.call(() => useGraveyard.getState().repairGrave(grave.id), undefined, t.repair);
    timeline.to(crackMaterial, { opacity: 0, duration: 0.6 }, t.repair);

    timeline.to(sparkUniforms.uOpacity, { value: 1, duration: 0.1 }, t.bloom);
    timeline.to(sparkUniforms.uProgress, { value: 1, duration: t.end - t.bloom, ease: "power2.out" }, t.bloom);
    timeline.to(sparkUniforms.uOpacity, { value: 0, duration: 0.25 }, t.end - 0.25);
    timeline.to(pointLight, { intensity: 0, duration: 0.3 }, t.end - 0.3);

    timeline.to(ambient, { intensity: AMBIENT_INTENSITY, duration: 0.5 }, t.end - 0.5);
    timeline.to(key, { intensity: KEY_INTENSITY, duration: 0.5 }, t.end - 0.5);

    return () => {
      timeline.kill();
      holder.visible = false;
      ambient.intensity = AMBIENT_INTENSITY;
      key.intensity = KEY_INTENSITY;
      // Leaving mid-sequence must not leave the button disabled on the next visit.
      if (useGraveyard.getState().resurrectingId === grave.id) {
        useGraveyard.getState().finishResurrection();
      }
    };
  }, [resurrectingId, layout, scene, ghostUniforms, sparkUniforms]);

  return (
    <group ref={group} visible={false}>
      <pointLight ref={light} color="#55D68A" position={[0, 1.6, 1]} distance={14} decay={1.6} intensity={0} />
      <mesh position={[0, 0.95, 0.24]} raycast={() => null} renderOrder={7}>
        <planeGeometry args={[1.5, 1.9]} />
        <meshBasicMaterial
          ref={crack}
          color="#55D68A"
          map={crackTexture}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group ref={ghostHolder}>
        <Billboard>
          <mesh position={[0, 0.9, 0.6]} raycast={() => null} renderOrder={8}>
            <planeGeometry args={[1.5, 2.4]} />
            <shaderMaterial
              vertexShader={GHOST_VERTEX}
              fragmentShader={GHOST_FRAGMENT}
              uniforms={ghostUniforms}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </Billboard>
      </group>
      <points geometry={sparks} position={[0, 0.6, 0.5]} frustumCulled={false} raycast={() => null}>
        <shaderMaterial
          vertexShader={SPARK_VERTEX}
          fragmentShader={SPARK_FRAGMENT}
          uniforms={sparkUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
