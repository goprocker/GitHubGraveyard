"use client";

import { Box, Check, DoorOpen, GitFork, Gauge, Link2, List, RotateCcw } from "lucide-react";
import { useState } from "react";

import { saveQuality } from "@/lib/quality";
import { useGraveyard } from "@/lib/store";

import { SearchFilters } from "./SearchFilters";

interface ExploreBarProps {
  includeForks: boolean;
  onToggleForks: () => void;
  forkCount: number;
}

/** Icon-only control: the name lives in the tooltip and the screen-reader text. */
function IconControl({
  label,
  onClick,
  children,
  live = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  live?: boolean;
}) {
  return (
    <button type="button" className="control size-10 justify-center px-0 [&_svg]:size-[18px] [&_svg]:shrink-0" title={label} onClick={onClick}>
      {children}
      <span className="sr-only" aria-live={live ? "polite" : undefined}>
        {label}
      </span>
    </button>
  );
}

export function ExploreBar({ includeForks, onToggleForks, forkCount }: ExploreBarProps) {
  const viewMode = useGraveyard((state) => state.viewMode);
  const quality = useGraveyard((state) => state.quality);
  const setViewMode = useGraveyard((state) => state.setViewMode);
  const setQuality = useGraveyard((state) => state.setQuality);
  const sendCamera = useGraveyard((state) => state.sendCamera);
  const [copyStatus, setCopyStatus] = useState("Copy link");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Copy failed");
    }
    window.setTimeout(() => setCopyStatus("Copy link"), 2000);
  };

  const toggleQuality = () => {
    const next = quality === "high" ? "low" : "high";
    setQuality(next);
    saveQuality(next);
  };

  const divider = <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-bone/15" />;

  return (
    <div className="slab pointer-events-auto flex items-center gap-1.5 p-1.5 pr-3 max-md:overflow-x-auto">
      <SearchFilters />
      {divider}
      <button type="button" className="control" aria-pressed={includeForks} onClick={onToggleForks}>
        <GitFork aria-hidden="true" size={18} />
        Forks ({forkCount})
      </button>
      <button type="button" className="control" onClick={() => setViewMode(viewMode === "list" ? "scene" : "list")}>
        {viewMode === "list" ? <Box aria-hidden="true" size={18} /> : <List aria-hidden="true" size={18} />}
        {viewMode === "list" ? "Hide list" : "Show list"}
      </button>
      <span className="flex-1 max-md:hidden" />
      {divider}
      <IconControl label="Reset camera" onClick={() => sendCamera("reset")}>
        <RotateCcw aria-hidden="true" size={18} />
      </IconControl>
      <IconControl label="Home view" onClick={() => sendCamera("home")}>
        <DoorOpen aria-hidden="true" size={18} />
      </IconControl>
      <IconControl label={`Quality: ${quality}`} onClick={toggleQuality}>
        <Gauge aria-hidden="true" size={18} className={quality === "low" ? "text-lichen" : "text-lantern"} />
      </IconControl>
      <IconControl label={copyStatus} onClick={() => void copyLink()} live>
        {copyStatus === "Link copied" ? (
          <Check aria-hidden="true" size={18} className="text-lantern" />
        ) : (
          <Link2 aria-hidden="true" size={18} />
        )}
      </IconControl>
    </div>
  );
}
