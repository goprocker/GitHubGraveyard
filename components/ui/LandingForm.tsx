"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LandingForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  const prefetchScene = () => {
    void import("@/components/three/GraveyardCanvas");
  };

  const visit = (event: React.FormEvent) => {
    event.preventDefault();
    const user = username.trim().replace(/^@/, "");
    if (user) router.push(`/graveyard?user=${encodeURIComponent(user)}`);
  };

  return (
    <div className="relative z-10 flex w-full max-w-5xl flex-col items-start px-6 pb-44 sm:px-12 sm:pb-52">
      <p className="dawn-late text-base text-lichen">GitHub Graveyard</p>
      <h1 className="dawn inscription mt-3 max-w-[14ch] font-serif text-6xl leading-[0.95] italic sm:text-8xl lg:text-9xl">
        Here lies everything you meant to finish.
      </h1>
      <p className="dawn-late mt-6 max-w-md text-lg leading-relaxed text-bone/80">
        Enter any GitHub username to see their public repositories laid to rest by how long ago they were last pushed to.
      </p>
      <form onSubmit={visit} className="dawn-late mt-8 flex w-full max-w-md flex-wrap gap-2">
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
          className="control min-h-12 min-w-0 flex-1 px-4 text-lg"
        />
        <button type="submit" disabled={!username.trim()} className="control control-primary min-h-12 px-7 text-lg">
          Open the gates
        </button>
      </form>
      <Link href="/graveyard" onPointerEnter={prefetchScene} className="dawn-late mt-4 text-bone/70 underline">
        Or visit the owner&apos;s graveyard
      </Link>
    </div>
  );
}
