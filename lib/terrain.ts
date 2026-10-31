export const PATH_HALF_WIDTH = 1.8;
export const GATE_Z = 16;
const RIM_MAX_HEIGHT = 9;

/** Center line of the dirt path at a given depth. */
export function pathX(z: number): number {
  return Math.sin(z * 0.09) * 1.1;
}

export function distanceToPath(x: number, z: number): number {
  return Math.abs(x - pathX(z));
}

/** Ground height, shared by the terrain mesh, grave placement and the camera clamp. */
export function terrainHeight(x: number, z: number): number {
  const rolling =
    Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.06) * 0.55 +
    Math.sin(x * 0.19 - z * 0.13) * 0.16 +
    Math.cos(z * 0.23 + x * 0.05) * 0.1;

  // The ground rises at the far edges so the cemetery sits in a shallow bowl.
  const distance = Math.hypot(x, z + 20);
  const rim = Math.max(0, distance - 62);
  const raised = rolling + Math.min(RIM_MAX_HEIGHT, rim * rim * 0.012);

  // Flatten toward the path so the camera route stays smooth, but only inside the cemetery,
  // so the path doesn't cut a notch through the surrounding rim.
  const pathBlend = Math.min(1, Math.max(0, (distanceToPath(x, z) - PATH_HALF_WIDTH) / 5));
  return raised * Math.max(pathBlend, Math.min(1, rim / 15));
}
