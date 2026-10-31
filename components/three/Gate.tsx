"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  ExtrudeGeometry,
  type Group,
  type InstancedMesh,
  Object3D,
  Shape,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { GATE_Z, terrainHeight } from "@/lib/terrain";

const GATE_HALF_WIDTH = 3.1;
const DOOR_BARS = 8;
const BAR_SPACING = 0.5;
const CUTAWAY_HEIGHT = 8;

function buildBar(height: number): BufferGeometry {
  const bar = new BoxGeometry(0.07, height, 0.07).toNonIndexed();
  bar.translate(0, height / 2, 0);
  const spike = new ConeGeometry(0.075, 0.28, 6).toNonIndexed();
  spike.translate(0, height + 0.14, 0);
  const merged = mergeGeometries([bar, spike], false);
  bar.dispose();
  spike.dispose();
  return merged;
}

function buildArch(): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-GATE_HALF_WIDTH - 0.5, 0);
  shape.absarc(0, 0, GATE_HALF_WIDTH + 0.5, Math.PI, 0, true);
  shape.lineTo(GATE_HALF_WIDTH + 0.05, 0);
  shape.absarc(0, 0, GATE_HALF_WIDTH + 0.05, 0, Math.PI, false);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: 28 });
}

function placedBox(width: number, height: number, depth: number, x: number, y: number): BufferGeometry {
  const box = new BoxGeometry(width, height, depth);
  box.translate(x, y, 0);
  const flat = box.toNonIndexed();
  box.dispose();
  return flat;
}

function mergeAndDispose(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Pillars, caps and arch as one geometry, since none of them move separately. */
function buildMasonry(): BufferGeometry {
  const pillarX = GATE_HALF_WIDTH + 0.28;
  const arch = buildArch();
  arch.translate(0, 5.2, -0.25);
  return mergeAndDispose([
    placedBox(0.92, 5.2, 0.92, -pillarX, 2.6),
    placedBox(1.18, 0.24, 1.18, -pillarX, 5.32),
    placedBox(0.92, 5.2, 0.92, pillarX, 2.6),
    placedBox(1.18, 0.24, 1.18, pillarX, 5.32),
    arch,
  ]);
}

function buildRails(): BufferGeometry {
  return mergeAndDispose(
    [0.6, 3.2].map((y) => placedBox(GATE_HALF_WIDTH, 0.1, 0.08, GATE_HALF_WIDTH / 2, y)),
  );
}

function nameplate(username: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.fillStyle = "#2B2E3F";
  context.fillRect(0, 0, 1024, 160);
  context.strokeStyle = "#A8A58F";
  context.lineWidth = 6;
  context.strokeRect(8, 8, 1008, 144);
  context.fillStyle = "#F0E6CC";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Georgia, serif";
  context.font = `64px ${family}`;
  context.fillText(`The graves of ${username}`, 512, 84, 960);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface Placement {
  x: number;
  y: number;
  z: number;
}

function Bars({ geometry, placements }: { geometry: BufferGeometry; placements: readonly Placement[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    placements.forEach(({ x, y, z }, index) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [placements]);
  return (
    <instancedMesh
      key={placements.length}
      ref={ref}
      args={[geometry, undefined, placements.length]}
      raycast={() => null}
    >
      <meshStandardMaterial color="#1B1D28" roughness={0.65} metalness={0.7} />
    </instancedMesh>
  );
}

interface GateProps {
  username: string;
  openness: { value: number };
  fenceReach: number;
}

export function Gate({ username, openness, fenceReach }: GateProps) {
  const leftDoor = useRef<Group>(null);
  const rightDoor = useRef<Group>(null);
  const structure = useRef<Group>(null);

  const doorBar = useMemo(() => buildBar(3.6), []);
  const fenceBar = useMemo(() => buildBar(2.1), []);
  const masonry = useMemo(() => buildMasonry(), []);
  const rails = useMemo(() => buildRails(), []);
  const plate = useMemo(() => nameplate(username), [username]);

  const doorBars = useMemo(
    () =>
      Array.from({ length: DOOR_BARS }, (_, index) => ({
        x: (index + 0.6) * (GATE_HALF_WIDTH / DOOR_BARS),
        y: 0,
        z: 0,
      })),
    [],
  );

  const fence = useMemo(() => {
    const placements: Placement[] = [];
    for (const side of [-1, 1]) {
      for (let x = GATE_HALF_WIDTH + 1; x <= fenceReach; x += BAR_SPACING) {
        placements.push({ x: side * x, y: terrainHeight(side * x, GATE_Z) - 0.05, z: GATE_Z });
      }
    }
    return placements;
  }, [fenceReach]);

  // A cutaway: from high vantage points the gate would only block the view of the graves.
  useFrame(({ camera }) => {
    if (structure.current) structure.current.visible = camera.position.y < CUTAWAY_HEIGHT;
    const angle = openness.value * 1.75;
    if (leftDoor.current) leftDoor.current.rotation.y = angle;
    if (rightDoor.current) rightDoor.current.rotation.y = -angle;
  });

  useEffect(
    () => () => {
      doorBar.dispose();
      fenceBar.dispose();
      masonry.dispose();
      rails.dispose();
      plate.dispose();
    },
    [doorBar, fenceBar, masonry, rails, plate],
  );

  const stone = <meshStandardMaterial color="#6E6C72" roughness={0.95} />;
  const iron = <meshStandardMaterial color="#1B1D28" roughness={0.65} metalness={0.7} />;

  return (
    <group>
      <group ref={structure} position={[0, 0, GATE_Z]}>
        <mesh geometry={masonry} castShadow raycast={() => null}>
          {stone}
        </mesh>
        <mesh position={[0, 6.15, 0.3]} raycast={() => null}>
          <planeGeometry args={[4.4, 0.69]} />
          <meshStandardMaterial map={plate} emissiveMap={plate} emissive="#FFFFFF" emissiveIntensity={0.45} />
        </mesh>

        <group ref={leftDoor} position={[-GATE_HALF_WIDTH, 0, 0]}>
          <Bars geometry={doorBar} placements={doorBars} />
          <mesh geometry={rails} raycast={() => null}>
            {iron}
          </mesh>
        </group>
        <group ref={rightDoor} position={[GATE_HALF_WIDTH, 0, 0]} scale={[-1, 1, 1]}>
          <Bars geometry={doorBar} placements={doorBars} />
          <mesh geometry={rails} raycast={() => null}>
            {iron}
          </mesh>
        </group>
      </group>
      <Bars geometry={fenceBar} placements={fence} />
    </group>
  );
}
