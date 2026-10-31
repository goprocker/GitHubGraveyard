"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { usernameProblem } from "@/lib/username";

export function LandingForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = usernameProblem(value);
    setProblem(found);
    if (!found) router.push(`/graveyard/${value.trim()}`);
  };

  const prefetchScene = () => {
    void import("@/components/three/GraveyardCanvas");
  };

  return (
    <div
      className="relative z-10 flex w-full max-w-xl flex-col items-center px-8 pb-12 pt-24 text-center sm:px-16"
      style={{
        borderRadius: "50% 50% 0 0 / 34% 34% 0 0",
        background: "linear-gradient(170deg, #c9c3af, #989381 72%, #6f6c60)",
        boxShadow: "0 0 90px rgb(200 216 255 / 0.22), inset 0 0 50px rgb(35 38 58 / 0.3)",
      }}
    >
      <h1 className="carved font-serif text-5xl leading-none sm:text-7xl">GitHub Graveyard</h1>
      <p className="carved mt-5 max-w-sm text-lg leading-snug">
        Enter a username to walk through a cemetery of their public repositories.
      </p>

      <form onSubmit={submit} noValidate className="mt-7 flex w-full flex-col gap-3">
        <label htmlFor="username" className="carved text-left font-medium">
          GitHub username
        </label>
        <input
          id="username"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={prefetchScene}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={60}
          aria-invalid={problem !== null}
          aria-describedby={problem ? "username-problem" : undefined}
          className="min-h-12 w-full rounded-[3px] border border-night/60 bg-night/90 px-3 text-lg text-bone placeholder:text-lichen"
          placeholder="octocat"
        />
        {problem && (
          <p id="username-problem" role="alert" className="text-left font-bold text-[#4a0f14]">
            {problem}
          </p>
        )}
        <button
          type="submit"
          className="min-h-12 cursor-pointer rounded-[3px] bg-night text-lg font-bold text-bone hover:bg-dusk"
        >
          Open the gates
        </button>
      </form>

      <Link href="/demo" className="carved mt-5 underline underline-offset-4" onFocus={prefetchScene}>
        Visit the demo graveyard
      </Link>
    </div>
  );
}
