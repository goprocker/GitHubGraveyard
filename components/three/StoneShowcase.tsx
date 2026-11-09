"use client";

import { PerspectiveCamera, View } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { prefersReducedMotion } from "@/lib/quality";
import type { PrestigeTier, RepoStatus } from "@/lib/types";

import { MAX_TILT } from "./Tombstone";
import { buildGraveMaterials, buildGraveShapes, type GraveMaterials, type GraveShape } from "./TombstoneGeometries";

// Built once and shared by every landing stone, exactly as the graveyard scene builds them.
let shared: { shapes: Record<PrestigeTier, GraveShape[]>; materials: GraveMaterials } | null = null;
function assets() {
  shared ??= { shapes: buildGraveShapes(), materials: buildGraveMaterials() };
  return shared;
}

function Stone({ tier, status }: { tier: PrestigeTier; status: RepoStatus }) {
  const spin = useRef<Group>(null);
  const { shapes, materials } = assets();
  const shape = shapes[tier][0]!;
  const tilt = MAX_TILT[status] * 1.6;
  const still = prefersReducedMotion();

  useFrame(({ clock, pointer }) => {
    const group = spin.current;
    if (!group || still) return;
    // A slow idle turn, nudged toward the cursor so the stone feels picked up and examined.
    const target = Math.sin(clock.elapsedTime * 0.4) * 0.35 + pointer.x * 0.5;
    group.rotation.y += (target - group.rotation.y) * 0.05;
  });

  const distance = shape.height * 1.55 + 1.6;
  return (
    <>
      <PerspectiveCamera makeDefault fov={32} position={[0, shape.height * 0.55, distance]} />
      <hemisphereLight args={["#c8d8ff", "#1a1e33", 0.7]} />
      <directionalLight position={[-3, 6, 5]} intensity={2.2} color="#dfe7ff" />
      <pointLight position={[2.5, 0.6, 2]} intensity={4} distance={8} color="#e8b45a" />
      <group position={[0, -0.1, 0]} ref={spin}>
        <group rotation={[tilt * 0.6, 0, -tilt]}>
          <mesh geometry={shape.geometry} material={materials.stone[status].base} />
        </group>
      </group>
    </>
  );
}

/** A slot in the page where a real graveyard stone is drawn by the shared canvas. */
export function StoneView({ tier, status, className }: { tier: PrestigeTier; status: RepoStatus; className?: string }) {
  return (
    <View className={className}>
      <Stone tier={tier} status={status} />
    </View>
  );
}

/** One fixed canvas behind the page that draws every StoneView, so the landing needs a single WebGL context. */
export function StoneCanvas() {
  return (
    <Canvas
      className="pointer-events-none"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
      eventSource={typeof document === "undefined" ? undefined : document.body}
      eventPrefix="client"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <View.Port />
    </Canvas>
  );
}
