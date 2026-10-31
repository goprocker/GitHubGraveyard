import type { RefObject } from "react";
import type { DirectionalLight, HemisphereLight } from "three";

/** Values animated by GSAP and read per frame, kept out of React state to avoid rerenders. */
export interface SceneState {
  gateOpen: { value: number };
  ambient: RefObject<HemisphereLight | null>;
  keyLight: RefObject<DirectionalLight | null>;
}

export const AMBIENT_INTENSITY = 1.35;
export const KEY_INTENSITY = 2.2;
