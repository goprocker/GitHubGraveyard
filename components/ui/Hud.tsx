"use client";

import { Home } from "lucide-react";
import Link from "next/link";

interface HudProps {
  username: string;
  repoCount: number;
  stale: boolean;
}

export function Hud({ username, repoCount, stale }: HudProps) {
  return (
    <header className="slab pointer-events-auto flex items-center gap-4 py-1.5 pr-1.5 pl-5">
      <span className="font-serif text-2xl leading-none italic">GitHub Graveyard</span>
      <span className="min-w-0 flex-1 truncate text-sm text-lichen">
        {username}, {repoCount.toLocaleString("en-US")}{" "}
        {repoCount === 1 ? "repository" : "repositories"}
        {stale ? ", saved copy because GitHub is unavailable" : ""}
      </span>
      <span className="shrink-0 text-sm text-lichen max-md:hidden">Walk with W A S D, hold Shift to run</span>
      <Link className="control" href="/">
        <Home aria-hidden="true" size={16} />
        <span className="sr-only">Back to the landing page</span>
      </Link>
    </header>
  );
}
