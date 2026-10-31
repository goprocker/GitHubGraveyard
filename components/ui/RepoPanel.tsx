"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { formatInactivity, STATUS_COLORS, STATUS_LABELS } from "@/lib/classify";
import { TIER_LABELS } from "@/lib/prestige";
import { useGraveyard } from "@/lib/store";
import type { EnrichedRepo } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface RepoPanelProps {
  repos: readonly EnrichedRepo[];
  /** Resurrection needs the 3D scene, so the list-only fallback leaves it out. */
  sceneActive: boolean;
  isRendered: (id: number) => boolean;
}

export function RepoPanel({ repos, sceneActive, isRendered }: RepoPanelProps) {
  const selectedId = useGraveyard((state) => state.selectedId);
  const select = useGraveyard((state) => state.select);
  const resurrectingId = useGraveyard((state) => state.resurrectingId);
  const repaired = useGraveyard((state) => selectedId !== null && state.resurrectedIds.has(selectedId));
  const startResurrection = useGraveyard((state) => state.startResurrection);
  const closeRef = useRef<HTMLButtonElement>(null);

  const repo = repos.find((candidate) => candidate.id === selectedId);

  useEffect(() => {
    if (selectedId !== null) closeRef.current?.focus();
  }, [selectedId]);

  if (!repo) return null;

  const canResurrect = sceneActive && repo.status !== "alive" && isRendered(repo.id) && !repaired;

  return (
    <aside
      aria-label={`Details for ${repo.name}`}
      className="slab pointer-events-auto absolute inset-x-2 bottom-2 z-30 max-h-[58dvh] overflow-y-auto p-4 md:inset-x-auto md:top-16 md:right-3 md:bottom-auto md:max-h-[calc(100dvh-5rem)] md:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="break-words font-serif text-3xl leading-tight">{repo.name}</h2>
        <button ref={closeRef} type="button" className="control shrink-0" onClick={() => select(null)}>
          <X aria-hidden="true" size={16} />
          <span className="sr-only">Close details</span>
        </button>
      </div>

      <p className="mt-1 font-bold" style={{ color: STATUS_COLORS[repo.status] }}>
        {STATUS_LABELS[repo.status]}, pushed {formatInactivity(repo.inactiveDays)}
      </p>
      <p className="mt-3 font-serif text-xl italic leading-snug">&ldquo;{repo.epitaph}&rdquo;</p>
      {repo.description && <p className="mt-3 leading-relaxed text-bone/90">{repo.description}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-lichen">Language</dt>
          <dd>{repo.language ?? "Not detected"}</dd>
        </div>
        <div>
          <dt className="text-lichen">Stars</dt>
          <dd>{repo.stars.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt className="text-lichen">Forks</dt>
          <dd>{repo.forks.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt className="text-lichen">Marker</dt>
          <dd>{TIER_LABELS[repo.tier]}</dd>
        </div>
        <div>
          <dt className="text-lichen">Created</dt>
          <dd>{formatDate(repo.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-lichen">Last push</dt>
          <dd>{repo.pushedAt ? formatDate(repo.pushedAt) : "No push date from GitHub"}</dd>
        </div>
      </dl>

      {repo.usedCreatedDate && (
        <p className="mt-3 text-sm text-lichen">GitHub gave no push date, so status uses the creation date.</p>
      )}
      <p className="mt-3 text-sm text-lichen">
        Status is an approximate activity signal from the last push. It says nothing about code quality.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {repo.htmlUrl && (
          <a className="control" href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" size={16} />
            Open on GitHub
          </a>
        )}
        {canResurrect && (
          <button
            type="button"
            className="control"
            disabled={resurrectingId !== null}
            onClick={() => startResurrection(repo.id)}
          >
            {resurrectingId === repo.id ? "Resurrecting" : "Demo Resurrection"}
          </button>
        )}
      </div>
      {(canResurrect || repaired) && (
        <p className="mt-2 text-sm text-lichen">
          {repaired ? "Resurrected for this visit only. " : ""}Demo Resurrection: your GitHub data is untouched.
        </p>
      )}
    </aside>
  );
}
