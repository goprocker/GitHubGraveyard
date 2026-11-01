"use client";

import { Search } from "lucide-react";

import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/classify";
import { useGraveyard } from "@/lib/store";

export function SearchFilters() {
  const query = useGraveyard((state) => state.query);
  const statuses = useGraveyard((state) => state.statuses);
  const setQuery = useGraveyard((state) => state.setQuery);
  const toggleStatus = useGraveyard((state) => state.toggleStatus);

  return (
    <div className="flex items-center gap-1.5">
      <label className="control cursor-text bg-bone/[0.06] focus-within:border-lantern/60">
        <Search aria-hidden="true" size={16} />
        <span className="sr-only">Search repositories</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="w-28 bg-transparent outline-none placeholder:text-lichen focus:w-44 motion-safe:transition-[width]"
        />
      </label>
      {STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          className="control"
          aria-pressed={statuses.has(status)}
          onClick={() => toggleStatus(status)}
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: STATUS_COLORS[status], boxShadow: `0 0 8px ${STATUS_COLORS[status]}` }}
          />
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
