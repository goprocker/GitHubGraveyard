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
    <div className="flex flex-wrap items-center gap-2 max-md:flex-nowrap">
      <label className="control cursor-text">
        <Search aria-hidden="true" size={16} />
        <span className="sr-only">Search repositories</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search repositories"
          className="w-40 bg-transparent outline-none placeholder:text-lichen"
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
            style={{ background: STATUS_COLORS[status] }}
          />
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
