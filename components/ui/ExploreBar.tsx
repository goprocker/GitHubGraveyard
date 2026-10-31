"use client";

import { Box, DoorOpen, GitFork, Gauge, Link2, List, RotateCcw } from "lucide-react";
import { useState } from "react";

import { saveQuality } from "@/lib/quality";
import { useGraveyard } from "@/lib/store";

import { SearchFilters } from "./SearchFilters";

interface ExploreBarProps {
  includeForks: boolean;
  onToggleForks: () => void;
  forkCount: number;
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

  return (
    <div className="slab pointer-events-auto flex flex-wrap items-center gap-2 p-2 max-md:flex-nowrap max-md:overflow-x-auto">
      <SearchFilters />
      <button type="button" className="control" aria-pressed={includeForks} onClick={onToggleForks}>
        <GitFork aria-hidden="true" size={16} />
        Forks ({forkCount})
      </button>
      <button type="button" className="control" onClick={() => setViewMode(viewMode === "list" ? "scene" : "list")}>
        {viewMode === "list" ? <Box aria-hidden="true" size={16} /> : <List aria-hidden="true" size={16} />}
        {viewMode === "list" ? "Hide list" : "Show list"}
      </button>
      <button type="button" className="control" onClick={() => sendCamera("reset")}>
        <RotateCcw aria-hidden="true" size={16} />
        Reset camera
      </button>
      <button type="button" className="control" onClick={() => sendCamera("home")}>
        <DoorOpen aria-hidden="true" size={16} />
        Home view
      </button>
      <button type="button" className="control" onClick={toggleQuality}>
        <Gauge aria-hidden="true" size={16} />
        Quality: {quality}
      </button>
      <button type="button" className="control" onClick={() => void copyLink()}>
        <Link2 aria-hidden="true" size={16} />
        <span aria-live="polite">{copyStatus}</span>
      </button>
    </div>
  );
}
