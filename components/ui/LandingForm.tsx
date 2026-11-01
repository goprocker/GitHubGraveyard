"use client";

import Link from "next/link";

export function LandingForm() {
  const prefetchScene = () => {
    void import("@/components/three/GraveyardCanvas");
  };

  return (
    <div className="relative z-10 flex w-full max-w-5xl flex-col items-start px-6 pb-44 sm:px-12 sm:pb-52">
      <p className="dawn-late text-base text-lichen">GitHub Graveyard</p>
      <h1 className="dawn inscription mt-3 max-w-[14ch] font-serif text-6xl leading-[0.95] italic sm:text-8xl lg:text-9xl">
        Here lies everything I meant to finish.
      </h1>
      <p className="dawn-late mt-6 max-w-md text-lg leading-relaxed text-bone/80">
        Every repository I own, public and private, laid to rest by how long ago I last pushed to it.
      </p>
      <Link
        href="/graveyard"
        onFocus={prefetchScene}
        onPointerEnter={prefetchScene}
        className="control control-primary dawn-late mt-8 min-h-12 px-7 text-lg"
      >
        Open the gates
      </Link>
    </div>
  );
}
