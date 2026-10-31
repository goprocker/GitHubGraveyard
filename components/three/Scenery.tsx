"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  type InstancedMesh,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { generateScenery } from "@/lib/layout";
import type { QualitySettings } from "@/lib/quality";
import { createRandom, range, type Random } from "@/lib/seed";
import { useGraveyard } from "@/lib/store";
import type { CemeteryLayout, EnrichedRepo, GravePlacement, ScatterItem } from "@/lib/types";

const UP = new Vector3(0, 1, 0);

function limb(from: Vector3, to: Vector3, radiusStart: number, radiusEnd: number): BufferGeometry {
  const direction = to.clone().sub(from);
  const geometry = new CylinderGeometry(radiusEnd, radiusStart, direction.length(), 5, 1, true);
  geometry.translate(0, direction.length() / 2, 0);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.clone().normalize()));
  geometry.translate(from.x, from.y, from.z);
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  return flat;
}

function growBranch(
  parts: BufferGeometry[],
  random: Random,
  from: Vector3,
  direction: Vector3,
  length: number,
  radius: number,
  depth: number,
): void {
  const to = from.clone().addScaledVector(direction, length);
  const endRadius = radius * 0.62;
  parts.push(limb(from, to, radius, endRadius));
  if (depth === 0) return;
  const branches = depth >= 3 ? 2 : 2 + Math.floor(random() * 2);
  for (let i = 0; i < branches; i++) {
    const next = direction
      .clone()
      .add(new Vector3(range(random, -0.85, 0.85), range(random, -0.1, 0.55), range(random, -0.85, 0.85)))
      .normalize();
    growBranch(parts, random, to, next, length * range(random, 0.62, 0.82), endRadius, depth - 1);
  }
}

function buildTree(seed: number): BufferGeometry {
  const random = createRandom(seed);
  const parts: BufferGeometry[] = [];
  growBranch(parts, random, new Vector3(0, -0.3, 0), new Vector3(0.08, 1, 0.04).normalize(), 2.6, 0.26, 4);
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged;
}

function buildRock(seed: number): BufferGeometry {
  const random = createRandom(seed);
  const geometry = new IcosahedronGeometry(1, 1).toNonIndexed();
  const position = geometry.attributes.position;
  const offsets = new Map<string, number>();
  if (position) {
    for (let i = 0; i < position.count; i++) {
      const key = `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
      const scale = offsets.get(key) ?? range(random, 0.72, 1.12);
      offsets.set(key, scale);
      position.setXYZ(i, position.getX(i) * scale, position.getY(i) * scale * 0.62, position.getZ(i) * scale);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function buildTuft(): BufferGeometry {
  const parts = [0, 1, 2, 3, 4].map((index) => {
    const blade = new ConeGeometry(0.035, range(createRandom(index + 3), 0.32, 0.58), 3).toNonIndexed();
    blade.translate(0, 0.22, 0);
    blade.rotateZ((index - 2) * 0.18);
    blade.rotateY(index * 1.3);
    blade.translate((index - 2) * 0.05, 0, ((index * 3) % 5) * 0.03 - 0.06);
    return blade;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged;
}

function shadowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  // alphaMap reads the green channel, so this needs an opaque black background.
  context.fillStyle = "#000";
  context.fillRect(0, 0, 64, 64);
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.75)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

interface InstancedItem {
  x: number;
  y: number;
  z: number;
  rotationX?: number;
  rotationY: number;
  scale: number;
}

function Instances({
  geometry,
  material,
  items,
  castShadow = false,
}: {
  geometry: BufferGeometry;
  material: Material;
  items: readonly InstancedItem[];
  castShadow?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    items.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(item.rotationX ?? 0, item.rotationY, 0);
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      raycast={() => null}
    />
  );
}

function byVariant(items: readonly ScatterItem[], variant: number): ScatterItem[] {
  return items.filter((item) => item.variant === variant);
}

/** Places an accessory in front of a grave, following that grave's rotation. */
function inFront(grave: GravePlacement, side: number, forward: number, y: number, scale: number): InstancedItem {
  const sin = Math.sin(grave.rotationY);
  const cos = Math.cos(grave.rotationY);
  return {
    x: grave.x + side * cos + forward * sin,
    y: grave.y + y,
    z: grave.z - side * sin + forward * cos,
    rotationY: grave.rotationY,
    scale,
  };
}

interface SceneryProps {
  layout: CemeteryLayout;
  repos: readonly EnrichedRepo[];
  settings: QualitySettings;
  seed: number;
}

export function Scenery({ layout, repos, settings, seed }: SceneryProps) {
  const repaired = useGraveyard((state) => state.resurrectedIds);

  const resources = useMemo(
    () => ({
      trees: [buildTree(1301), buildTree(2203), buildTree(3307)],
      rocks: [buildRock(41), buildRock(43)],
      tuft: buildTuft(),
      sprout: new ConeGeometry(0.07, 0.42, 5),
      lantern: new CylinderGeometry(0.09, 0.11, 0.32, 6),
      wreath: new TorusGeometry(0.2, 0.055, 6, 18),
      growth: new SphereGeometry(0.34, 7, 5),
      bark: new MeshStandardMaterial({ color: "#2B2730", roughness: 1 }),
      stone: new MeshStandardMaterial({ color: "#55524C", roughness: 1 }),
      grass: new MeshStandardMaterial({ color: "#6A8259", roughness: 1 }),
      sproutMaterial: new MeshStandardMaterial({ color: "#55D68A", emissive: "#55D68A", emissiveIntensity: 0.35 }),
      lanternMaterial: new MeshBasicMaterial({ color: "#E8B45A", toneMapped: false }),
      wreathMaterial: new MeshStandardMaterial({ color: "#7E9B86", roughness: 0.9 }),
      mossMaterial: new MeshStandardMaterial({ color: "#3E5636", roughness: 1 }),
      ivyMaterial: new MeshStandardMaterial({ color: "#2A4A32", roughness: 1 }),
      shadowTexture: shadowTexture(),
    }),
    [],
  );

  const shadowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: "#04050C",
        alphaMap: resources.shadowTexture,
        transparent: true,
        depthWrite: false,
      }),
    [resources],
  );

  const scenery = useMemo(
    () => generateScenery(layout, { trees: settings.trees, rocks: settings.rocks, grass: settings.grass }, seed),
    [layout, settings, seed],
  );

  const shadows = useMemo(
    () =>
      layout.graves.map((grave) => ({
        x: grave.x,
        y: grave.y + 0.04,
        z: grave.z,
        rotationX: -Math.PI / 2,
        rotationY: 0,
        scale: 3.2 * grave.scale,
      })),
    [layout],
  );

  const details = useMemo(() => {
    const groups = {
      sprouts: [] as InstancedItem[],
      lanterns: [] as InstancedItem[],
      wreaths: [] as InstancedItem[],
      moss: [] as InstancedItem[],
      ivy: [] as InstancedItem[],
    };
    if (!settings.graveDetails) return groups;
    const statusById = new Map(repos.map((repo) => [repo.id, repo.status]));
    for (const grave of layout.graves) {
      const status = repaired.has(grave.id) ? "alive" : statusById.get(grave.id);
      if (status === "alive") {
        groups.sprouts.push(
          inFront(grave, -0.42, 0.62, 0.2, 1),
          inFront(grave, 0.1, 0.72, 0.18, 0.85),
          inFront(grave, 0.45, 0.6, 0.2, 1.1),
        );
      } else if (status === "forgotten") {
        groups.lanterns.push(inFront(grave, 0.56, 0.62, 0.24, 1));
      } else if (status === "archived") {
        groups.wreaths.push(inFront(grave, 0, 0.42, 0.3, 1));
      } else if (status === "buried") {
        groups.moss.push(inFront(grave, -0.42, 0.34, 0.06, 1), inFront(grave, 0.38, 0.36, 0.04, 0.72));
      } else if (status === "ancient") {
        groups.ivy.push(
          inFront(grave, -0.5, 0.3, 0.12, 1.15),
          inFront(grave, -0.46, 0.2, 0.62, 0.75),
          inFront(grave, 0.5, 0.3, 0.12, 0.95),
        );
      }
    }
    return groups;
  }, [layout, repos, repaired, settings]);

  const shadowPlane = useMemo(() => {
    return new PlaneGeometry(1, 1);
  }, []);

  useEffect(
    () => () => {
      for (const value of Object.values(resources)) {
        if (Array.isArray(value)) value.forEach((item) => item.dispose());
        else value.dispose();
      }
      shadowMaterial.dispose();
      shadowPlane.dispose();
    },
    [resources, shadowMaterial, shadowPlane],
  );

  return (
    <group>
      {resources.trees.map((geometry, variant) => (
        <Instances
          key={variant}
          geometry={geometry}
          material={resources.bark}
          items={byVariant(scenery.trees, variant)}
          castShadow={settings.shadows}
        />
      ))}
      {resources.rocks.map((geometry, variant) => (
        <Instances key={variant} geometry={geometry} material={resources.stone} items={byVariant(scenery.rocks, variant)} />
      ))}
      <Instances geometry={resources.tuft} material={resources.grass} items={scenery.grass} />
      <Instances geometry={shadowPlane} material={shadowMaterial} items={shadows} />
      <Instances geometry={resources.sprout} material={resources.sproutMaterial} items={details.sprouts} />
      <Instances geometry={resources.lantern} material={resources.lanternMaterial} items={details.lanterns} />
      <Instances geometry={resources.wreath} material={resources.wreathMaterial} items={details.wreaths} />
      <Instances geometry={resources.growth} material={resources.mossMaterial} items={details.moss} />
      <Instances geometry={resources.growth} material={resources.ivyMaterial} items={details.ivy} />
    </group>
  );
}
