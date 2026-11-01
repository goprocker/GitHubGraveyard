"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  SRGBColorSpace,
} from "three";

import { createRandom } from "@/lib/seed";

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    float h = clamp(vDirection.y, 0.0, 1.0);
    vec3 horizon = vec3(0.24, 0.30, 0.50);
    vec3 middle = vec3(0.06, 0.08, 0.20);
    vec3 zenith = vec3(0.015, 0.02, 0.07);
    vec3 color = mix(horizon, middle, smoothstep(0.0, 0.22, h));
    color = mix(color, zenith, smoothstep(0.18, 0.75, h));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const MOON_POSITION: [number, number, number] = [-70, 85, -300];

function haloTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(200,216,255,0.75)");
  gradient.addColorStop(0.3, "rgba(200,216,255,0.22)");
  gradient.addColorStop(1, "rgba(200,216,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function moonTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.fillStyle = "#F4F6FF";
  context.fillRect(0, 0, 256, 256);
  const random = createRandom(17);
  for (let i = 0; i < 26; i++) {
    const x = random() * 256;
    const y = random() * 256;
    const radius = 8 + random() * 38;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(150,162,196,0.42)");
    gradient.addColorStop(1, "rgba(150,162,196,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function buildStars(): BufferGeometry {
  const random = createRandom(99);
  const positions: number[] = [];
  for (let i = 0; i < 900; i++) {
    const angle = random() * Math.PI * 2;
    const y = random() * 0.92 + 0.06;
    const flat = Math.sqrt(1 - y * y);
    positions.push(Math.cos(angle) * flat * 420, y * 420, Math.sin(angle) * flat * 420);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

/** A closed ring of ridgeline, sampled from whole-number sine frequencies so its ends meet. */
function buildHills(radius: number, base: number, amplitude: number, seed: number): BufferGeometry {
  const random = createRandom(seed);
  const phases = [random(), random(), random()].map((value) => value * Math.PI * 2);
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 160;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const ridge =
      Math.sin(angle * 3 + (phases[0] as number)) * 0.5 +
      Math.sin(angle * 8 + (phases[1] as number)) * 0.32 +
      Math.sin(angle * 19 + (phases[2] as number)) * 0.18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 20;
    positions.push(x, -10, z, x, base + ridge * amplitude, z);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

const SKY_UNIFORMS = {};

export function Sky() {
  const halo = useMemo(() => haloTexture(), []);
  const moon = useMemo(() => moonTexture(), []);
  const stars = useMemo(() => buildStars(), []);
  const farHills = useMemo(() => buildHills(300, 62, 18, 11), []);
  const nearHills = useMemo(() => buildHills(230, 42, 15, 23), []);

  useEffect(
    () => () => {
      halo.dispose();
      moon.dispose();
      stars.dispose();
      farHills.dispose();
      nearHills.dispose();
    },
    [halo, moon, stars, farHills, nearHills],
  );

  return (
    <group>
      <mesh raycast={() => null} renderOrder={-10}>
        <sphereGeometry args={[480, 32, 16]} />
        <shaderMaterial
          side={BackSide}
          depthWrite={false}
          fog={false}
          vertexShader={SKY_VERTEX}
          fragmentShader={SKY_FRAGMENT}
          uniforms={SKY_UNIFORMS}
        />
      </mesh>
      <points geometry={stars} raycast={() => null}>
        <pointsMaterial color="#DCE6FF" size={1.3} sizeAttenuation={false} fog={false} transparent opacity={0.85} />
      </points>
      <mesh position={MOON_POSITION} raycast={() => null}>
        <circleGeometry args={[26, 48]} />
        <meshBasicMaterial map={moon} fog={false} toneMapped={false} />
      </mesh>
      <sprite position={MOON_POSITION} scale={[300, 300, 1]} raycast={() => null}>
        <spriteMaterial map={halo} blending={AdditiveBlending} depthWrite={false} depthTest={false} fog={false} transparent />
      </sprite>
      <mesh geometry={farHills} raycast={() => null}>
        <meshBasicMaterial color="#1B2144" fog={false} side={BackSide} />
      </mesh>
      <mesh geometry={nearHills} raycast={() => null}>
        <meshBasicMaterial color="#12162F" fog={false} side={BackSide} />
      </mesh>
    </group>
  );
}
