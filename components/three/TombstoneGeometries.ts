import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { createRandom } from "@/lib/seed";
import type { PrestigeTier, RepoStatus } from "@/lib/types";

const DEPTH = 0.24;
const BEVEL = 0.035;
const SLAB_FACE = DEPTH / 2 + BEVEL + 0.012;

export interface GraveShape {
  geometry: BufferGeometry;
  faceZ: number;
  labelY: number;
  labelWidth: number;
  height: number;
}

export type StateMaterials = Record<"base" | "hover" | "selected" | "dim", MeshStandardMaterial>;

function extrude(shape: Shape, y = 0): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 10,
  });
  geometry.translate(0, y, -DEPTH / 2);
  return geometry;
}

function box(width: number, height: number, depth: number, y: number): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(0, y + height / 2, 0);
  return geometry;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const prepared = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(prepared, false);
  parts.forEach((part) => part.dispose());
  prepared.forEach((part) => part.dispose());
  return merged;
}

// Grave bases sink slightly so uneven ground never shows a gap.
const SLAB_BASE_Y = -0.15;

function slabBase(width: number): BufferGeometry {
  return box(width, 0.27, 0.52, SLAB_BASE_Y);
}

function basicShapes(): GraveShape[] {
  const arched = new Shape();
  arched.moveTo(-0.55, 0);
  arched.lineTo(-0.55, 1.0);
  arched.absarc(0, 1.0, 0.55, Math.PI, 0, true);
  arched.lineTo(0.55, 0);
  arched.closePath();

  const shouldered = new Shape();
  shouldered.moveTo(-0.58, 0);
  shouldered.lineTo(-0.58, 1.18);
  shouldered.lineTo(-0.4, 1.3);
  shouldered.lineTo(-0.4, 1.46);
  shouldered.lineTo(0.4, 1.46);
  shouldered.lineTo(0.4, 1.3);
  shouldered.lineTo(0.58, 1.18);
  shouldered.lineTo(0.58, 0);
  shouldered.closePath();

  const peaked = new Shape();
  peaked.moveTo(-0.56, 0);
  peaked.lineTo(-0.56, 1.15);
  peaked.quadraticCurveTo(-0.1, 1.28, 0, 1.58);
  peaked.quadraticCurveTo(0.1, 1.28, 0.56, 1.15);
  peaked.lineTo(0.56, 0);
  peaked.closePath();

  return [arched, shouldered, peaked].map((shape) => ({
    geometry: merge([extrude(shape, 0.08), slabBase(1.42)]),
    faceZ: SLAB_FACE,
    labelY: 0.74,
    labelWidth: 0.96,
    height: 1.62,
  }));
}

function decorativeShapes(): GraveShape[] {
  const gothic = new Shape();
  gothic.moveTo(-0.66, 0);
  gothic.lineTo(-0.66, 1.18);
  gothic.quadraticCurveTo(-0.58, 1.74, 0, 2.08);
  gothic.quadraticCurveTo(0.58, 1.74, 0.66, 1.18);
  gothic.lineTo(0.66, 0);
  gothic.closePath();

  const ogee = new Shape();
  ogee.moveTo(-0.66, 0);
  ogee.lineTo(-0.66, 1.25);
  ogee.bezierCurveTo(-0.66, 1.75, -0.14, 1.65, 0, 2.15);
  ogee.bezierCurveTo(0.14, 1.65, 0.66, 1.75, 0.66, 1.25);
  ogee.lineTo(0.66, 0);
  ogee.closePath();

  const tablet = new Shape();
  tablet.moveTo(-0.66, 0);
  tablet.lineTo(-0.66, 1.44);
  tablet.lineTo(-0.46, 1.44);
  tablet.absarc(0, 1.44, 0.46, Math.PI, 0, true);
  tablet.lineTo(0.66, 1.44);
  tablet.lineTo(0.66, 0);
  tablet.closePath();

  const finial = (x: number, y: number, radius: number) => {
    const sphere = new SphereGeometry(radius, 10, 8);
    sphere.translate(x, y, 0);
    return sphere;
  };

  return [
    merge([extrude(gothic, 0.08), slabBase(1.68), finial(0, 2.24, 0.09)]),
    merge([extrude(ogee, 0.08), slabBase(1.68), finial(0, 2.31, 0.08)]),
    merge([extrude(tablet, 0.08), slabBase(1.68), finial(-0.66, 1.62, 0.1), finial(0.66, 1.62, 0.1)]),
  ].map((geometry) => ({
    geometry,
    faceZ: SLAB_FACE,
    labelY: 0.82,
    labelWidth: 1.14,
    height: 2.3,
  }));
}

function elaborateShapes(): GraveShape[] {
  const cross = new Shape();
  cross.moveTo(-0.17, 0);
  cross.lineTo(-0.17, 1.28);
  cross.lineTo(-0.66, 1.28);
  cross.lineTo(-0.66, 1.62);
  cross.lineTo(-0.17, 1.62);
  cross.lineTo(-0.17, 2.1);
  cross.lineTo(0.17, 2.1);
  cross.lineTo(0.17, 1.62);
  cross.lineTo(0.66, 1.62);
  cross.lineTo(0.66, 1.28);
  cross.lineTo(0.17, 1.28);
  cross.lineTo(0.17, 0);
  cross.closePath();

  const winged = new Shape();
  winged.moveTo(-0.8, 0);
  winged.lineTo(-0.8, 1.32);
  winged.quadraticCurveTo(-1.02, 1.62, -0.72, 1.74);
  winged.quadraticCurveTo(-0.52, 1.72, -0.5, 1.9);
  winged.absarc(0, 1.9, 0.5, Math.PI, 0, true);
  winged.quadraticCurveTo(0.52, 1.72, 0.72, 1.74);
  winged.quadraticCurveTo(1.02, 1.62, 0.8, 1.32);
  winged.lineTo(0.8, 0);
  winged.closePath();

  const ringSlab = new Shape();
  ringSlab.moveTo(-0.62, 0);
  ringSlab.lineTo(-0.5, 1.58);
  ringSlab.lineTo(0.5, 1.58);
  ringSlab.lineTo(0.62, 0);
  ringSlab.closePath();
  const ring = new TorusGeometry(0.42, 0.09, 8, 24);
  ring.translate(0, 2.16, 0);
  const hub = new SphereGeometry(0.14, 10, 8);
  hub.translate(0, 2.16, 0);

  return [
    {
      geometry: merge([
        box(1.72, 0.3, 1.1, -0.15),
        box(1.44, 0.46, 0.84, 0.15),
        extrude(cross, 0.61),
      ]),
      faceZ: 0.432,
      labelY: 0.38,
      labelWidth: 0.82,
      height: 2.71,
    },
    {
      geometry: merge([extrude(winged, 0.1), slabBase(1.98)]),
      faceZ: SLAB_FACE,
      labelY: 0.92,
      labelWidth: 1.32,
      height: 2.5,
    },
    {
      geometry: merge([extrude(ringSlab, 0.1), slabBase(1.62), ring, hub]),
      faceZ: SLAB_FACE,
      labelY: 0.86,
      labelWidth: 1.02,
      height: 2.68,
    },
  ];
}

function monumentShapes(): GraveShape[] {
  const plinth = () => [box(2.2, 0.32, 2.2, -0.15), box(1.84, 0.82, 1.84, 0.17)];

  const shaft = new CylinderGeometry(0.28, 0.56, 3.2, 4);
  shaft.rotateY(Math.PI / 4);
  shaft.translate(0, 2.59, 0);
  const cap = new ConeGeometry(0.396, 0.46, 4);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, 4.42, 0);

  const column = new CylinderGeometry(0.4, 0.46, 2.6, 16);
  column.translate(0, 2.3, 0);
  const capital = new CylinderGeometry(0.58, 0.42, 0.26, 16);
  capital.translate(0, 3.72, 0);
  const urn = new SphereGeometry(0.36, 14, 10);
  urn.scale(1, 1.2, 1);
  urn.translate(0, 4.2, 0);

  const pillar = (x: number, z: number) => {
    const part = new CylinderGeometry(0.12, 0.14, 1.9, 10);
    part.translate(x, 1.94, z);
    return part;
  };
  const pediment = new Shape();
  pediment.moveTo(-0.98, 0);
  pediment.lineTo(0, 0.68);
  pediment.lineTo(0.98, 0);
  pediment.closePath();

  return [
    [shaft, cap],
    [column, capital, urn],
    [
      pillar(-0.72, 0.62),
      pillar(0.72, 0.62),
      pillar(-0.72, -0.62),
      pillar(0.72, -0.62),
      box(0.98, 1.6, 0.98, 0.99),
      box(1.96, 0.16, 1.7, 2.89),
      extrude(pediment, 3.05),
    ],
  ].map((parts) => ({
    geometry: merge([...plinth(), ...parts]),
    faceZ: 0.932,
    labelY: 0.58,
    labelWidth: 1.5,
    height: 4.6,
  }));
}

export function buildGraveShapes(): Record<PrestigeTier, GraveShape[]> {
  return {
    basic: basicShapes(),
    decorative: decorativeShapes(),
    elaborate: elaborateShapes(),
    monument: monumentShapes(),
  };
}

export function buildStarGeometry(): BufferGeometry {
  const star = new Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 0.1 : 0.042;
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  return new ExtrudeGeometry(star, { depth: 0.02, bevelEnabled: false });
}

function noiseField(size: number, seed: number): Float32Array {
  const random = createRandom(seed);
  const field = new Float32Array(size * size);
  // Layered, wrapping value noise, so the texture tiles without seams.
  for (let cells = 4; cells <= 64; cells *= 2) {
    const grid = Array.from({ length: cells * cells }, () => random());
    const weight = 4 / cells;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells;
        const gy = (y / size) * cells;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const tx = gx - x0;
        const ty = gy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const at = (ix: number, iy: number) =>
          grid[(iy % cells) * cells + (ix % cells)] as number;
        const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
        const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
        field[y * size + x] = (field[y * size + x] as number) + (top * (1 - sy) + bottom * sy) * weight;
      }
    }
  }
  return field;
}

function textureFromField(
  size: number,
  paint: (index: number, pixel: Uint8ClampedArray, offset: number) => void,
  repeat: number,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const image = context.createImageData(size, size);
  for (let index = 0; index < size * size; index++) {
    paint(index, image.data, index * 4);
    image.data[index * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function crackCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.fillStyle = "#000";
  context.fillRect(0, 0, size, size);
  const random = createRandom(4242);
  context.strokeStyle = "#fff";
  context.lineCap = "round";
  for (let crack = 0; crack < 9; crack++) {
    let x = random() * size;
    let y = random() * size;
    let angle = random() * Math.PI * 2;
    context.lineWidth = (0.6 + random() * 1.8) * (size / 256);
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 14; step++) {
      angle += (random() - 0.5) * 1.1;
      x += Math.cos(angle) * size * 0.05;
      y += Math.sin(angle) * size * 0.05;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  return canvas;
}

export interface GraveMaterials {
  stone: Record<RepoStatus, StateMaterials>;
  star: MeshStandardMaterial;
  crackTexture: CanvasTexture;
  groundTexture: CanvasTexture;
  dispose: () => void;
}

const STATUS_STONE: Record<
  RepoStatus,
  { color: string; emissive: string; glow: number; surface: "clean" | "moss" | "cracked" }
> = {
  alive: { color: "#E5D8B8", emissive: "#55D68A", glow: 0.05, surface: "clean" },
  forgotten: { color: "#BDB196", emissive: "#E8B45A", glow: 0.025, surface: "clean" },
  buried: { color: "#ABA791", emissive: "#000000", glow: 0, surface: "moss" },
  ancient: { color: "#9A9692", emissive: "#34204D", glow: 0.1, surface: "cracked" },
  archived: { color: "#BCC8E4", emissive: "#C8D8FF", glow: 0.09, surface: "clean" },
};

export function buildGraveMaterials(): GraveMaterials {
  const size = 256;
  const noise = noiseField(size, 7);
  const blotch = noiseField(size, 19);
  const cracks = crackCanvas(size).getContext("2d")?.getImageData(0, 0, size, size).data;

  const clean = textureFromField(
    size,
    (index, pixel, offset) => {
      const value = 190 + ((noise[index] as number) - 0.9) * 150;
      pixel[offset] = value;
      pixel[offset + 1] = value;
      pixel[offset + 2] = value;
    },
    1.2,
  );

  const moss = textureFromField(
    size,
    (index, pixel, offset) => {
      const value = 165 + ((noise[index] as number) - 0.9) * 170;
      const growth = Math.max(0, Math.min(1, ((blotch[index] as number) - 0.92) * 5));
      pixel[offset] = value * (1 - growth * 0.62);
      pixel[offset + 1] = value * (1 - growth * 0.12);
      pixel[offset + 2] = value * (1 - growth * 0.66);
    },
    1.2,
  );

  const cracked = textureFromField(
    size,
    (index, pixel, offset) => {
      const growth = Math.max(0, Math.min(1, ((blotch[index] as number) - 0.95) * 5));
      const line = cracks ? (cracks[offset] as number) / 255 : 0;
      const value = (160 + ((noise[index] as number) - 0.9) * 190) * (1 - line * 0.82);
      pixel[offset] = value * (1 - growth * 0.5);
      pixel[offset + 1] = value * (1 - growth * 0.1);
      pixel[offset + 2] = value * (1 - growth * 0.55);
    },
    1.2,
  );

  const surfaces = { clean, moss, cracked };

  const stone = {} as Record<RepoStatus, StateMaterials>;
  for (const status of Object.keys(STATUS_STONE) as RepoStatus[]) {
    const { color, emissive, glow, surface } = STATUS_STONE[status];
    const base = new MeshStandardMaterial({
      color,
      map: surfaces[surface],
      bumpMap: surfaces[surface],
      bumpScale: surface === "clean" ? 0.6 : 1.4,
      roughness: 0.94,
      metalness: 0,
      emissive,
      emissiveIntensity: glow,
    });
    const hover = base.clone();
    hover.emissive.set("#73D7FF");
    hover.emissiveIntensity = 0.07;
    const selected = base.clone();
    selected.emissive.set("#73D7FF");
    selected.emissiveIntensity = 0.1;
    const dim = base.clone();
    dim.color.multiplyScalar(0.28);
    dim.emissiveIntensity = 0;
    stone[status] = { base, hover, selected, dim };
  }

  const star = new MeshStandardMaterial({
    color: "#E8B45A",
    emissive: "#E8B45A",
    emissiveIntensity: 0.55,
    roughness: 0.5,
    metalness: 0.4,
  });

  const crackTexture = new CanvasTexture(crackCanvas(512));
  crackTexture.wrapS = RepeatWrapping;
  crackTexture.wrapT = RepeatWrapping;

  const groundTexture = textureFromField(
    size,
    (index, pixel, offset) => {
      const value = 205 + ((noise[index] as number) - 0.9) * 80;
      pixel[offset] = value;
      pixel[offset + 1] = value;
      pixel[offset + 2] = value;
    },
    23,
  );
  groundTexture.anisotropy = 8;

  return {
    stone,
    star,
    crackTexture,
    groundTexture,
    dispose: () => {
      for (const group of Object.values(stone)) {
        Object.values(group).forEach((material) => material.dispose());
      }
      star.dispose();
      Object.values(surfaces).forEach((texture) => texture.dispose());
      crackTexture.dispose();
      groundTexture.dispose();
    },
  };
}
