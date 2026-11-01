"use client";

import { AdaptiveDpr, Html, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { MeshBasicMaterial, type DirectionalLight, type HemisphereLight, Vector3 } from "three";

import { STATUS_COLORS, STATUS_LABELS } from "@/lib/classify";
import { generateLayout } from "@/lib/layout";
import { QUALITY, type QualitySettings } from "@/lib/quality";
import { hashString } from "@/lib/seed";
import { useGraveyard } from "@/lib/store";
import type { CemeteryLayout, EnrichedRepo } from "@/lib/types";

import { CameraDirector } from "./CameraDirector";
import { Fog } from "./Fog";
import { Gate } from "./Gate";
import { GraveGlows } from "./GraveGlows";
import { GraveStars } from "./GraveStars";
import { buildLabelAtlas } from "./LabelAtlas";
import { Particles } from "./Particles";
import { PathLanterns } from "./PathLanterns";
import { ResurrectionEffect } from "./ResurrectionEffect";
import { Scenery } from "./Scenery";
import { AMBIENT_INTENSITY, KEY_INTENSITY, type SceneState } from "./sceneState";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";
import { Tombstone } from "./Tombstone";
import { buildGraveMaterials, buildGraveShapes, buildStarGeometry } from "./TombstoneGeometries";
import { Walker } from "./Walker";
import { WebGLBoundary } from "./WebGLBoundary";

const E2E = process.env.NEXT_PUBLIC_E2E === "1";

function HoverHighlight({ layout, repos }: { layout: CemeteryLayout; repos: readonly EnrichedRepo[] }) {
  const activeId = useGraveyard((state) => state.hoveredId ?? state.selectedId);
  const grave = layout.graves.find((candidate) => candidate.id === activeId);
  const repo = repos.find((candidate) => candidate.id === activeId);
  if (!grave || !repo) return null;
  return (
    <group position={[grave.x, grave.y, grave.z]}>
      <pointLight color="#F2C377" position={[0, 2.4, 2.2]} intensity={5} distance={11} decay={1.6} />
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[1.75, 1.9, 48]} />
        <meshBasicMaterial color="#F2C377" transparent opacity={0.75} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html position={[0, 3, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="slab w-max max-w-64 px-3 py-1.5 text-center">
          <div className="break-words font-serif text-lg leading-tight text-bone">{repo.name}</div>
          <div className="text-sm" style={{ color: STATUS_COLORS[repo.status] }}>
            {STATUS_LABELS[repo.status]}
          </div>
        </div>
      </Html>
    </group>
  );
}

/** Test-only hook, compiled out unless NEXT_PUBLIC_E2E is set. */
function TestHook({ layout }: { layout: CemeteryLayout }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const target = window as unknown as Record<string, unknown>;
    target.__graveyard = {
      screenPosition: (id: number) => {
        const grave = layout.graves.find((candidate) => candidate.id === id);
        if (!grave) return null;
        const point = new Vector3(grave.x, grave.y + 0.8, grave.z).project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((point.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - point.y) / 2) * rect.height,
        };
      },
      graveIds: () => layout.graves.map((grave) => grave.id),
      drawCalls: () => gl.info.render.calls,
    };
    return () => {
      delete target.__graveyard;
    };
  }, [layout, camera, gl]);
  return null;
}

interface SceneProps {
  username: string;
  repos: readonly EnrichedRepo[];
  layout: CemeteryLayout;
  settings: QualitySettings;
}

function Scene({ username, repos, layout, settings }: SceneProps) {
  const ambient = useRef<HemisphereLight>(null);
  const keyLight = useRef<DirectionalLight>(null);
  const gateOpen = useRef({ value: 0 }).current;
  const scene = useMemo<SceneState>(() => ({ gateOpen, ambient, keyLight }), [gateOpen]);

  const shapes = useMemo(() => buildGraveShapes(), []);
  const materials = useMemo(() => buildGraveMaterials(), []);
  const starGeometry = useMemo(() => buildStarGeometry(), []);
  const atlas = useMemo(
    () => buildLabelAtlas(repos, settings.atlasWidth, settings.atlasHeight),
    [repos, settings.atlasWidth, settings.atlasHeight],
  );
  const labelMaterials = useMemo(
    () => ({
      normal: new MeshBasicMaterial({ map: atlas.texture, transparent: true }),
      dim: new MeshBasicMaterial({ map: atlas.texture, transparent: true, opacity: 0.14 }),
    }),
    [atlas],
  );

  useEffect(
    () => () => {
      atlas.dispose();
      labelMaterials.normal.dispose();
      labelMaterials.dim.dispose();
    },
    [atlas, labelMaterials],
  );

  useEffect(
    () => () => {
      Object.values(shapes)
        .flat()
        .forEach((shape) => shape.geometry.dispose());
      materials.dispose();
      starGeometry.dispose();
    },
    [shapes, materials, starGeometry],
  );

  const graveById = useMemo(() => new Map(layout.graves.map((grave) => [grave.id, grave])), [layout]);
  const starred = useMemo(
    () =>
      repos.flatMap((repo) => {
        const grave = graveById.get(repo.id);
        const shape = grave ? shapes[repo.tier][grave.variant] : undefined;
        return grave && shape ? [{ repo, grave, shape }] : [];
      }),
    [repos, graveById, shapes],
  );
  const shadowExtent = layout.radius + 12;

  return (
    <>
      <fogExp2 attach="fog" args={["#171D3A", 0.0105]} />
      <hemisphereLight ref={ambient} args={["#8FA4E0", "#2A2B3A", AMBIENT_INTENSITY]} />
      <directionalLight
        ref={keyLight}
        color="#C8D8FF"
        intensity={KEY_INTENSITY}
        position={[layout.center.x - 32, 52, layout.center.z + 42]}
        castShadow={settings.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-far={180}
      >
        <object3D attach="target" position={[layout.center.x, 0, layout.center.z]} />
      </directionalLight>

      <Sky />
      <Terrain texture={materials.groundTexture} />
      <Gate username={username} openness={gateOpen} fenceReach={layout.bounds.maxX + 10} />
      <Scenery layout={layout} repos={repos} settings={settings} seed={hashString(`scenery:${username}`)} />
      <Fog layout={layout} repos={repos} sheets={settings.fogSheets} />
      <Particles layout={layout} count={settings.particles} />

      <PathLanterns layout={layout} />
      <Walker layout={layout} repos={repos} />
      <GraveGlows layout={layout} repos={repos} />
      <GraveStars graves={starred} geometry={starGeometry} material={materials.star} />
      {repos.map((repo, index) => {
        const grave = graveById.get(repo.id);
        const geometry = atlas.geometries[index];
        const shape = grave ? shapes[repo.tier][grave.variant] : undefined;
        if (!grave || !geometry || !shape) return null;
        return (
          <Tombstone
            key={repo.id}
            repo={repo}
            grave={grave}
            shape={shape}
            materials={materials}
            labelGeometry={geometry}
            labelMaterial={labelMaterials.normal}
            dimLabelMaterial={labelMaterials.dim}
            castShadow={settings.shadows}
          />
        );
      })}

      <HoverHighlight layout={layout} repos={repos} />
      <ResurrectionEffect layout={layout} crackTexture={materials.crackTexture} scene={scene} />
      <CameraDirector layout={layout} gateOpen={gateOpen} />
      {E2E && <TestHook layout={layout} />}
    </>
  );
}

interface GraveyardCanvasProps {
  username: string;
  repos: readonly EnrichedRepo[];
  onFailure: () => void;
}

export default function GraveyardCanvas({ username, repos, onFailure }: GraveyardCanvasProps) {
  const quality = useGraveyard((state) => state.quality);
  const setQuality = useGraveyard((state) => state.setQuality);
  const [hidden, setHidden] = useState(false);
  const settings = QUALITY[quality];
  const layout = useMemo(() => generateLayout(username, repos), [username, repos]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <WebGLBoundary onFailure={onFailure}>
      <Canvas
        frameloop={hidden ? "never" : "always"}
        shadows={settings.shadows}
        dpr={[1, settings.maxDpr]}
        camera={{ fov: 50, near: 0.2, far: 1000, position: [0, 3, 40] }}
        gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", onFailure, { once: true });
        }}
        onPointerMissed={() => useGraveyard.getState().setHovered(null)}
      >
        <color attach="background" args={["#171D3A"]} />
        {!E2E && <PerformanceMonitor onFallback={() => setQuality("low")} flipflops={2} />}
        {!E2E && <AdaptiveDpr pixelated />}
        <Scene username={username} repos={repos} layout={layout} settings={settings} />
      </Canvas>
    </WebGLBoundary>
  );
}
