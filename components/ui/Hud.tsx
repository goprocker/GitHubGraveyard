"use client";

import { Home } from "lucide-react";
import Link from "next/link";

interface HudProps {
  username: string;
  demo: boolean;
  repoCount: number;
  stale: boolean;
}

export function Hud({ username, demo, repoCount, stale }: HudProps) {
  return (
    <header className="slab pointer-events-auto flex items-center gap-3 px-3 py-1.5">
      <span className="font-serif text-xl">GitHub Graveyard</span>
      <span className="min-w-0 flex-1 truncate text-lichen">
        {demo ? "Demo: invented repositories" : username}, {repoCount.toLocaleString("en-US")}{" "}
        {repoCount === 1 ? "repository" : "repositories"}
        {stale ? ", saved copy because GitHub is unavailable" : ""}
      </span>
      <Link className="control" href="/">
        <Home aria-hidden="true" size={16} />
        <span className="sr-only">Back to the landing page</span>
      </Link>
    </header>
  );
}
