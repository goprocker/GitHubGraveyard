"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ReactNode } from "react";

import type { PrestigeTier, RepoStatus } from "@/lib/types";
import { isWebGLAvailable } from "@/lib/webgl";

const StoneView = dynamic(() => import("../three/StoneShowcase").then((mod) => mod.StoneView), { ssr: false });
const StoneCanvas = dynamic(() => import("../three/StoneShowcase").then((mod) => mod.StoneCanvas), { ssr: false });

let webglSupport: boolean | undefined;
function readWebGLSupport(): boolean {
  webglSupport ??= isWebGLAvailable();
  return webglSupport;
}
const subscribeNever = () => () => {};

function useWebGL(): boolean {
  // The server and first paint assume no WebGL, so the drawn fallback shows until the browser confirms it.
  return useSyncExternalStore(subscribeNever, readWebGLSupport, () => false);
}

/** The graveyard's own 3D stone for this tier and status, or the drawn fallback without WebGL. */
export function RealStone({
  tier,
  status,
  fallback,
  className,
}: {
  tier: PrestigeTier;
  status: RepoStatus;
  fallback: ReactNode;
  className: string;
}) {
  const webgl = useWebGL();
  if (!webgl) return <div className={`flex items-end justify-center ${className}`}>{fallback}</div>;
  return <StoneView tier={tier} status={status} className={className} />;
}

export function StoneCanvasMount() {
  return useWebGL() ? <StoneCanvas /> : null;
}
