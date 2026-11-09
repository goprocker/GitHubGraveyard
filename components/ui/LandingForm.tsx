"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = ["octocat", "torvalds", "gaearon"];

export function LandingForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  const prefetchScene = () => {
    void import("@/components/three/GraveyardCanvas");
  };

  const open = (name: string) => {
    const user = name.trim().replace(/^@/, "");
    if (user) router.push(`/graveyard?user=${encodeURIComponent(user)}`);
  };

  return (
    <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-4 pb-44 text-center sm:pb-52">
      <h1 className="dawn inscription font-serif text-5xl leading-[1.02] italic sm:text-7xl">
        Here lies everything you meant to finish.
      </h1>
      <p className="dawn-late mt-5 max-w-lg text-lg leading-relaxed text-bone/80">
        Enter a GitHub username and walk through their public repositories, each laid to rest by how long ago it was
        last pushed to.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          open(username);
        }}
        className="slab dawn-late mt-9 flex w-full max-w-xl items-center gap-2 rounded-full! p-1.5 pl-5 focus-within:border-lantern/60"
      >
        <Search aria-hidden="true" size={20} className="shrink-0 text-lichen" />
        <label htmlFor="github-user" className="sr-only">
          GitHub username
        </label>
        <input
          id="github-user"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onFocus={prefetchScene}
          placeholder="GitHub username"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={40}
          className="min-w-0 flex-1 bg-transparent py-2 text-lg text-bone placeholder:text-lichen/70 focus:outline-none"
        />
        <button type="submit" disabled={!username.trim()} className="control control-primary min-h-11 shrink-0 px-6 text-base">
          Open the gates
        </button>
      </form>

      <div className="dawn-late mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-lichen">
        <span>Try</span>
        {EXAMPLES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => open(name)}
            className="control border-bone/15! min-h-8 px-3 text-sm"
          >
            {name}
          </button>
        ))}
      </div>

      <Link href="/graveyard" onPointerEnter={prefetchScene} className="dawn-late mt-6 text-sm text-bone/60 underline-offset-4 hover:text-bone hover:underline">
        Or visit the owner&apos;s graveyard
      </Link>
    </div>
  );
}
