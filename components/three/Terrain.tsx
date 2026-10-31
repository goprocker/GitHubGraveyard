"use client";

import { useEffect, useMemo } from "react";
import { Color, Float32BufferAttribute, PlaneGeometry, type Texture } from "three";

import { createRandom } from "@/lib/seed";
import { distanceToPath, PATH_HALF_WIDTH, terrainHeight } from "@/lib/terrain";

const SIZE = 260;
const SEGMENTS = 190;
const CENTER_Z = -20;

function buildGround(): PlaneGeometry {
  const geometry = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, CENTER_Z);

  const position = geometry.attributes.position;
  if (!position) return geometry;
  const random = createRandom(31);
  const grass = new Color("#35482F");
  const paleGrass = new Color("#4A5B3C");
  const dirt = new Color("#6B5842");
  const color = new Color();
  const colors: number[] = [];

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));
    color.copy(grass).lerp(paleGrass, random());
    const edge = (distanceToPath(x, z) - PATH_HALF_WIDTH) / 1.1;
    color.lerp(dirt, 1 - Math.min(1, Math.max(0, edge + random() * 0.3)));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function Terrain({ texture }: { texture: Texture }) {
  const geometry = useMemo(() => buildGround(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow raycast={() => null}>
      <meshStandardMaterial vertexColors map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}
