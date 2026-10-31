"use client";

import { Star } from "lucide-react";

import { formatInactivity, STATUS_COLORS, STATUS_LABELS } from "@/lib/classify";
import { useGraveyard } from "@/lib/store";
import type { EnrichedRepo } from "@/lib/types";

/** Every repository as a button: the keyboard path into the scene and the non-WebGL view. */
export function RepoList({ repos }: { repos: readonly EnrichedRepo[] }) {
  const select = useGraveyard((state) => state.select);

  if (repos.length === 0) {
    return <p className="p-4 text-lichen">No repositories match these filters. Clear the search or status filters.</p>;
  }

  return (
    <ul className="divide-y divide-lichen/20">
      {repos.map((repo) => (
        <li key={repo.id}>
          <button
            type="button"
            onClick={() => select(repo.id)}
            className="w-full cursor-pointer px-3 py-2.5 text-left hover:bg-moon/10"
          >
            <span className="block break-words font-serif text-lg leading-tight">{repo.name}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-lichen">
              <span style={{ color: STATUS_COLORS[repo.status] }}>{STATUS_LABELS[repo.status]}</span>
              <span>pushed {formatInactivity(repo.inactiveDays)}</span>
              {repo.language && <span>{repo.language}</span>}
              {repo.stars > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" size={12} />
                  <span className="sr-only">Stars:</span>
                  {repo.stars.toLocaleString("en-US")}
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
