"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, type Group, type PointLight, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { formatInactivity, STATUS_COLORS, STATUS_LABELS } from "@/lib/classify";
import { prefersReducedMotion } from "@/lib/quality";
import { useGraveyard } from "@/lib/store";
import { terrainHeight } from "@/lib/terrain";
import type { CemeteryLayout, EnrichedRepo, RepoStatus } from "@/lib/types";

const NEAR_DISTANCE = 3.4;
const WALK_SPEED = 5.5;
const RUN_SPEED = 10;
const FOLLOW_DISTANCE = 8.5;
const FOLLOW_HEIGHT = 3.6;

/** What happened to a repository, told from its status. */
const STORY: Record<RepoStatus, string> = {
  alive: "Still breathing. Someone pushed to it recently.",
  forgotten: "Left to rest. The pushes slowed, then stopped.",
  buried: "Buried under newer ideas. Nobody has visited in a long while.",
  ancient: "Untouched for ages. Moss has taken the stone.",
  archived: "Sealed on purpose. Archived and at peace.",
};

function glowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,226,170,0.9)");
  gradient.addColorStop(0.3, "rgba(240,170,80,0.3)");
  gradient.addColorStop(1, "rgba(240,170,80,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

interface WalkerProps {
  layout: CemeteryLayout;
  repos: readonly EnrichedRepo[];
}

const KEY_DIRECTIONS: Record<string, "w" | "a" | "s" | "d"> = {
  KeyW: "w",
  ArrowUp: "w",
  KeyA: "a",
  ArrowLeft: "a",
  KeyS: "s",
  ArrowDown: "s",
  KeyD: "d",
  ArrowRight: "d",
};

/** A cloaked caretaker with a lamp. WASD walks it, the camera follows, and it reads out the grave it stops beside. */
export function Walker({ layout, repos }: WalkerProps) {
  const outer = useRef<Group>(null);
  const body = useRef<Group>(null);
  const lampLight = useRef<PointLight>(null);
  const texture = useMemo(() => glowTexture(), []);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const heading = useRef(Math.PI);
  const [nearId, setNearId] = useState<number | null>(null);
  const nearRef = useRef<number | null>(null);
  // Held keys, plus keys tapped since the last frame so a quick tap still moves the caretaker a step.
  const held = useRef(new Set<string>());
  const tapped = useRef(new Set<string>());
  const running = useRef(false);
  const started = useRef(false);
  const settle = useRef(0);
  const look = useRef(new Vector3()).current;
  const goal = useRef(new Vector3()).current;

  // Layout-independent (physical keys) and ignored while typing in the search box.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (el.matches?.("input, textarea, select") || el.isContentEditable) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const direction = KEY_DIRECTIONS[event.code];
      running.current = event.shiftKey;
      if (!direction) return;
      if (event.code.startsWith("Arrow")) event.preventDefault();
      held.current.add(event.code);
      tapped.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => {
      running.current = event.shiftKey;
      held.current.delete(event.code);
    };
    const clear = () => held.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    const group = outer.current;
    const figure = body.current;
    if (!group || !figure) return;
    const visible = !useGraveyard.getState().introActive;
    group.visible = visible;
    if (!visible) return;

    const active = new Set<string>();
    for (const code of held.current) active.add(KEY_DIRECTIONS[code] as string);
    for (const code of tapped.current) active.add(KEY_DIRECTIONS[code] as string);
    tapped.current.clear();

    const ahead = (active.has("w") ? 1 : 0) - (active.has("s") ? 1 : 0);
    const side = (active.has("d") ? 1 : 0) - (active.has("a") ? 1 : 0);
    const moving = ahead !== 0 || side !== 0;
    if (moving && !started.current) {
      started.current = true;
      settle.current = 1.6;
    }

    const previousX = group.position.x;
    const previousZ = group.position.z;
    let wanted = heading.current;
    if (moving) {
      // Directions are relative to where the camera looks, so W always walks away from you.
      camera.getWorldDirection(look);
      look.y = 0;
      if (look.lengthSq() < 1e-4) look.set(0, 0, -1);
      look.normalize();
      const mx = look.x * ahead - look.z * side;
      const mz = look.z * ahead + look.x * side;
      const length = Math.hypot(mx, mz);
      const step = Math.max(delta, 1 / 60) * (running.current ? RUN_SPEED : WALK_SPEED);
      group.position.x += (mx / length) * step;
      group.position.z += (mz / length) * step;
      wanted = Math.atan2(mx, mz);
    }
    if (moving) {
      let turn = wanted - heading.current;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      heading.current += turn * (1 - Math.exp(-delta * 10));
    }
    const { center, radius } = layout;
    const fromCenterX = group.position.x - center.x;
    const fromCenterZ = group.position.z - center.z;
    const limit = radius + 8;
    const fromCenter = Math.hypot(fromCenterX, fromCenterZ);
    if (fromCenter > limit) {
      group.position.x = center.x + (fromCenterX / fromCenter) * limit;
      group.position.z = center.z + (fromCenterZ / fromCenter) * limit;
    }
    group.position.y = terrainHeight(group.position.x, group.position.z);

    // Third-person follow: the camera travels with the caretaker, and orbiting still works around it.
    if (started.current && controls?.enabled) {
      camera.position.x += group.position.x - previousX;
      camera.position.z += group.position.z - previousZ;
      goal.set(group.position.x, group.position.y + 1.3, group.position.z);
      if (moving || settle.current > 0) controls.target.lerp(goal, 1 - Math.exp(-delta * 6));
      if (settle.current > 0) {
        // On the first step, glide in from the overview to a close view behind the figure.
        settle.current -= delta;
        const k = 1 - Math.exp(-delta * 3);
        const offsetX = camera.position.x - goal.x;
        const offsetZ = camera.position.z - goal.z;
        const flat = Math.hypot(offsetX, offsetZ) || 1;
        const nextFlat = flat + (FOLLOW_DISTANCE - flat) * k;
        camera.position.x = goal.x + (offsetX / flat) * nextFlat;
        camera.position.z = goal.z + (offsetZ / flat) * nextFlat;
        camera.position.y += (goal.y + FOLLOW_HEIGHT - camera.position.y) * k;
      }
    }

    const t = clock.elapsedTime;
    const bob = reduced || !moving ? 0 : Math.abs(Math.sin(t * 9)) * 0.07;
    figure.position.y = bob;
    figure.rotation.y = heading.current;
    figure.rotation.z = reduced || !moving ? 0 : Math.sin(t * 9) * 0.03;

    if (lampLight.current) {
      lampLight.current.intensity = 7 * (reduced ? 1 : 0.92 + Math.sin(t * 11) * 0.05 + Math.sin(t * 23) * 0.04);
    }

    // The nearest grave within reach is the one the caretaker reads aloud.
    let nearest: number | null = null;
    let best = NEAR_DISTANCE;
    for (const grave of layout.graves) {
      const d = Math.hypot(grave.x - group.position.x, grave.z - group.position.z);
      if (d < best) {
        best = d;
        nearest = grave.id;
      }
    }
    if (nearest !== nearRef.current) {
      nearRef.current = nearest;
      setNearId(nearest);
    }
  });

  const repo = nearId === null ? undefined : repos.find((candidate) => candidate.id === nearId);

  return (
    <group ref={outer} position={[0, 0, 12]}>
      <group ref={body} scale={1.5}>
        <mesh position={[0, 0.62, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.26, 0.44, 1.2, 10]} />
          <meshStandardMaterial color="#1a2040" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.42, 0]} raycast={() => null}>
          <sphereGeometry args={[0.19, 12, 10]} />
          <meshStandardMaterial color="#d9c3a0" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.55, -0.03]} raycast={() => null}>
          <coneGeometry args={[0.27, 0.5, 10]} />
          <meshStandardMaterial color="#141934" roughness={0.95} />
        </mesh>
        <group position={[0.5, 0.95, 0.2]}>
          <mesh position={[0, -0.15, 0]} raycast={() => null}>
            <boxGeometry args={[0.2, 0.28, 0.2]} />
            <meshBasicMaterial color="#ffd08a" toneMapped={false} />
          </mesh>
          <pointLight ref={lampLight} color="#ffc680" intensity={7} distance={11} decay={1.5} position={[0, -0.15, 0]} />
          <sprite position={[0, -0.15, 0]} scale={[3.2, 3.2, 1]} raycast={() => null} renderOrder={9}>
            <spriteMaterial map={texture} blending={AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
          </sprite>
        </group>
      </group>

      {repo && (
        <Html position={[1.9, 1.4, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="slab w-72 -translate-y-1/2 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="break-words font-serif text-2xl leading-none font-semibold text-bone">{repo.name}</div>
              <div className="shrink-0 text-sm font-medium" style={{ color: STATUS_COLORS[repo.status] }}>
                {STATUS_LABELS[repo.status]}
              </div>
            </div>
            <p className="mt-2 text-sm leading-snug text-bone/90">{STORY[repo.status]}</p>
            <p className="mt-2 border-l-2 border-lantern/60 pl-2 font-serif text-lg leading-snug italic text-bone">
              &ldquo;{repo.epitaph}&rdquo;
            </p>
            <p className="mt-2 text-xs text-lichen">
              Last push {formatInactivity(repo.inactiveDays)}
              {repo.language ? `, ${repo.language}` : ""}
              {repo.stars > 0 ? `, ${repo.stars.toLocaleString("en-US")} stars` : ""}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
