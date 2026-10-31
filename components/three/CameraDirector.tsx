"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { prefersReducedMotion } from "@/lib/quality";
import { useGraveyard } from "@/lib/store";
import { GATE_Z, terrainHeight } from "@/lib/terrain";
import { INTRO } from "@/lib/timelines";
import type { CemeteryLayout } from "@/lib/types";

const MIN_CAMERA_CLEARANCE = 1.2;
const clamped = new Vector3();

interface Shot {
  position: [number, number, number];
  target: [number, number, number];
}

function overviewShot(layout: CemeteryLayout): Shot {
  const { center, radius } = layout;
  return {
    position: [center.x, Math.max(13, radius * 0.72), center.z + radius * 1.25 + 7],
    target: [center.x, 0.6, center.z + 1],
  };
}

const HOME_SHOT: Shot = {
  position: [0, 3.6, GATE_Z - 3],
  target: [0, 2, GATE_Z - 22],
};

interface CameraDirectorProps {
  layout: CemeteryLayout;
  gateOpen: { value: number };
}

export function CameraDirector({ layout, gateOpen }: CameraDirectorProps) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const animating = useRef(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const place = useCallback(
    (shot: Shot) => {
      camera.position.set(...shot.position);
      controls.current?.target.set(...shot.target);
      camera.lookAt(...shot.target);
      controls.current?.update();
    },
    [camera],
  );

  const stop = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    animating.current = false;
    if (controls.current) controls.current.enabled = true;
  }, []);

  const moveTo = useCallback(
    (shot: Shot, duration = 1.3) => {
      stop();
      if (prefersReducedMotion()) {
        place(shot);
        return;
      }
      const orbit = controls.current;
      if (!orbit) return;
      orbit.enabled = false;
      animating.current = true;
      const [px, py, pz] = shot.position;
      const [tx, ty, tz] = shot.target;
      const move = gsap.timeline({ onComplete: stop });
      move.to(camera.position, { x: px, y: py, z: pz, duration, ease: "power2.inOut" }, 0);
      move.to(orbit.target, { x: tx, y: ty, z: tz, duration, ease: "power2.inOut" }, 0);
      timeline.current = move;
    },
    [camera, place, stop],
  );

  // The intro runs once per scene. Later layout changes (fork toggle) leave the camera alone.
  useEffect(() => {
    const store = useGraveyard.getState();

    const finish = () => {
      stop();
      gateOpen.value = 1;
      place(overviewShot(layoutRef.current));
      useGraveyard.getState().finishIntro();
    };

    // The skip button appears before this lazy chunk loads, so a skip may already be waiting.
    if (prefersReducedMotion() || store.skipRequested > 0) {
      finish();
      return stop;
    }

    const orbit = controls.current;
    if (!orbit) return stop;
    orbit.enabled = false;
    animating.current = true;
    store.beginIntro();
    gateOpen.value = 0;
    place({ position: [0, 2.6, GATE_Z + 24], target: [0, 3.8, GATE_Z] });

    const end = overviewShot(layoutRef.current);
    const intro = gsap.timeline({ onComplete: finish });
    intro.to(gateOpen, { value: 1, duration: 2, ease: "power1.inOut" }, 1);
    intro.to(
      camera.position,
      { x: 0, y: 2.8, z: GATE_Z + 13, duration: INTRO.gateRevealEnd - INTRO.fadeInEnd, ease: "sine.inOut" },
      INTRO.fadeInEnd,
    );
    intro.to(
      camera.position,
      { y: 2.5, z: GATE_Z - 6, duration: INTRO.throughGateEnd - INTRO.gateRevealEnd, ease: "sine.inOut" },
      INTRO.gateRevealEnd,
    );
    intro.to(
      orbit.target,
      { y: 2.2, z: GATE_Z - 26, duration: INTRO.throughGateEnd - INTRO.gateRevealEnd, ease: "sine.inOut" },
      INTRO.gateRevealEnd,
    );
    intro.to(
      camera.position,
      {
        x: end.position[0],
        y: end.position[1],
        z: end.position[2],
        duration: INTRO.graveyardRevealEnd - INTRO.throughGateEnd,
        ease: "power2.inOut",
      },
      INTRO.throughGateEnd,
    );
    intro.to(
      orbit.target,
      {
        x: end.target[0],
        y: end.target[1],
        z: end.target[2],
        duration: INTRO.graveyardRevealEnd - INTRO.throughGateEnd,
        ease: "power2.inOut",
      },
      INTRO.throughGateEnd,
    );
    intro.call(() => useGraveyard.getState().showHud(), undefined, INTRO.hudFadeStart);
    intro.to({}, { duration: INTRO.hudFadeEnd - INTRO.hudFadeStart }, INTRO.hudFadeStart);
    timeline.current = intro;

    const unsubscribe = useGraveyard.subscribe((state, previous) => {
      if (state.skipRequested !== previous.skipRequested && state.introActive) finish();
    });

    return () => {
      unsubscribe();
      stop();
    };
  }, [camera, gateOpen, place, stop]);

  useEffect(
    () =>
      useGraveyard.subscribe((state, previous) => {
        if (state.introActive) return;

        if (state.cameraCommand && state.cameraCommand.nonce !== previous.cameraCommand?.nonce) {
          moveTo(state.cameraCommand.type === "home" ? HOME_SHOT : overviewShot(layoutRef.current));
        }

        if (state.focusNonce !== previous.focusNonce && state.selectedId !== null) {
          const grave = layoutRef.current.graves.find((candidate) => candidate.id === state.selectedId);
          if (!grave) return;
          // Offset the aim so the details panel doesn't cover the grave.
          const wide = window.innerWidth >= 768;
          moveTo(
            {
              position: [grave.x + (wide ? 1.8 : 0), grave.y + 3, grave.z + 9.5],
              target: [grave.x + (wide ? 1.8 : 0), grave.y + (wide ? 1.7 : 0.4), grave.z],
            },
            1.1,
          );
        }
      }),
    [moveTo],
  );

  useFrame(() => {
    const orbit = controls.current;
    if (animating.current && orbit) camera.lookAt(orbit.target);
    if (!orbit || animating.current) return;

    const { center, radius } = layoutRef.current;
    clamped.copy(orbit.target).setY(0);
    const dx = clamped.x - center.x;
    const dz = clamped.z - center.z;
    const distance = Math.hypot(dx, dz);
    const limit = radius + 10;
    if (distance > limit) {
      orbit.target.x = center.x + (dx / distance) * limit;
      orbit.target.z = center.z + (dz / distance) * limit;
    }
    orbit.target.y = Math.max(0, Math.min(8, orbit.target.y));

    const floor = terrainHeight(camera.position.x, camera.position.z) + MIN_CAMERA_CLEARANCE;
    if (camera.position.y < floor) camera.position.y = floor;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={layout.radius * 3 + 30}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}
