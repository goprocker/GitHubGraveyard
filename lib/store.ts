import { create } from "zustand";

import type { QualityLevel } from "./quality";
import type { RepoStatus } from "./types";

export type CameraCommand = "reset" | "home";
export type ViewMode = "scene" | "list";

interface GraveyardState {
  hoveredId: number | null;
  selectedId: number | null;
  /** Increments on each selection so reselecting a grave refocuses the camera. */
  focusNonce: number;
  query: string;
  statuses: ReadonlySet<RepoStatus>;
  /** IDs passing the filters, or null when no filter is active. */
  matchingIds: ReadonlySet<number> | null;
  viewMode: ViewMode;
  quality: QualityLevel;
  introActive: boolean;
  hudVisible: boolean;
  skipRequested: number;
  cameraCommand: { type: CameraCommand; nonce: number } | null;
  resurrectingId: number | null;
  /** Session-only demo state. Nothing here is sent anywhere or changes GitHub data. */
  resurrectedIds: ReadonlySet<number>;

  setHovered: (id: number | null) => void;
  select: (id: number | null) => void;
  setQuery: (query: string) => void;
  toggleStatus: (status: RepoStatus) => void;
  setMatchingIds: (ids: ReadonlySet<number> | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setQuality: (level: QualityLevel) => void;
  beginIntro: () => void;
  finishIntro: () => void;
  showHud: () => void;
  requestSkip: () => void;
  sendCamera: (type: CameraCommand) => void;
  startResurrection: (id: number) => void;
  repairGrave: (id: number) => void;
  finishResurrection: () => void;
  reset: () => void;
}

const initialState = {
  hoveredId: null,
  selectedId: null,
  focusNonce: 0,
  query: "",
  statuses: new Set<RepoStatus>(),
  matchingIds: null,
  viewMode: "scene" as ViewMode,
  introActive: true,
  hudVisible: false,
  skipRequested: 0,
  cameraCommand: null,
  resurrectingId: null,
  resurrectedIds: new Set<number>(),
};

export const useGraveyard = create<GraveyardState>((set, get) => ({
  ...initialState,
  quality: "high",

  setHovered: (hoveredId) => set({ hoveredId }),
  select: (selectedId) => set((state) => ({ selectedId, focusNonce: state.focusNonce + 1 })),
  setQuery: (query) => set({ query }),
  toggleStatus: (status) => {
    const statuses = new Set(get().statuses);
    if (!statuses.delete(status)) statuses.add(status);
    set({ statuses });
  },
  setMatchingIds: (matchingIds) => set({ matchingIds }),
  setViewMode: (viewMode) => set({ viewMode }),
  setQuality: (quality) => set({ quality }),
  beginIntro: () => set({ introActive: true, hudVisible: false }),
  finishIntro: () => set({ introActive: false, hudVisible: true }),
  showHud: () => set({ hudVisible: true }),
  requestSkip: () => set((state) => ({ skipRequested: state.skipRequested + 1 })),
  sendCamera: (type) =>
    set((state) => ({ cameraCommand: { type, nonce: (state.cameraCommand?.nonce ?? 0) + 1 } })),
  startResurrection: (resurrectingId) => {
    if (get().resurrectingId === null) set({ resurrectingId });
  },
  repairGrave: (id) => set({ resurrectedIds: new Set(get().resurrectedIds).add(id) }),
  finishResurrection: () => set({ resurrectingId: null }),
  reset: () =>
    set({
      ...initialState,
      statuses: new Set<RepoStatus>(),
      resurrectedIds: new Set<number>(),
    }),
}));
