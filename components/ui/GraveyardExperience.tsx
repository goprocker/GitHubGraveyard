"use client";

import { SkipForward } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { enrichRepo, filterRepos, MAX_RENDERED_GRAVES, selectRendered } from "@/lib/filter";
import { initialQuality } from "@/lib/quality";
import { useGraveyard } from "@/lib/store";
import type { ApiErrorBody, ApiErrorCode, GraveyardResponse } from "@/lib/types";
import { isWebGLAvailable } from "@/lib/webgl";

import { ExploreBar } from "./ExploreBar";
import { Hud } from "./Hud";
import { LoadingSequence } from "./LoadingSequence";
import { RepoList } from "./RepoList";
import { RepoPanel } from "./RepoPanel";
import { StateMessage } from "./StateMessage";

const GraveyardCanvas = dynamic(() => import("../three/GraveyardCanvas"), { ssr: false });

type Settled =
  | { key: string; kind: "ok"; data: GraveyardResponse; now: Date }
  | { key: string; kind: "error"; code: ApiErrorCode; message: string; retryAfter?: number };

let webglSupport: boolean | undefined;
function readWebGLSupport(): boolean {
  webglSupport ??= isWebGLAvailable();
  return webglSupport;
}
const subscribeNever = () => () => {};

async function loadGraveyard(user: string, includeForks: boolean, key: string): Promise<Settled> {
  try {
    const userParam = user ? `&user=${encodeURIComponent(user)}` : "";
    const response = await fetch(`/api/graveyard?includeForks=${includeForks}${userParam}`);
    const body: unknown = await response.json();
    if (response.ok) return { key, kind: "ok", data: body as GraveyardResponse, now: new Date() };
    const { error } = body as ApiErrorBody;
    return { key, kind: "error", code: error.code, message: error.message, retryAfter: error.retryAfter };
  } catch {
    return {
      key,
      kind: "error",
      code: "upstream_error",
      message: "The repositories could not be loaded. Check your connection and try again.",
    };
  }
}

function RetryButton({ retryAfter, onRetry }: { retryAfter?: number; onRetry: () => void }) {
  const [remaining, setRemaining] = useState(retryAfter ?? 0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  return (
    <button type="button" className="control" disabled={remaining > 0} onClick={onRetry}>
      {remaining > 0 ? `Try again in ${remaining.toLocaleString("en-US")}s` : "Try again"}
    </button>
  );
}

export function GraveyardExperience() {
  const user = useSearchParams().get("user")?.trim() ?? "";
  const [includeForks, setIncludeForks] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);

  const webgl = useSyncExternalStore(subscribeNever, readWebGLSupport, () => true);
  const query = useGraveyard((state) => state.query);
  const statuses = useGraveyard((state) => state.statuses);
  const viewMode = useGraveyard((state) => state.viewMode);
  const hudVisible = useGraveyard((state) => state.hudVisible);
  const introActive = useGraveyard((state) => state.introActive);
  const setMatchingIds = useGraveyard((state) => state.setMatchingIds);

  const key = `${user}:${includeForks}:${attempt}`;

  useEffect(() => {
    useGraveyard.getState().reset();
    useGraveyard.getState().setQuality(initialQuality());
    return () => useGraveyard.getState().reset();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadGraveyard(user, includeForks, key).then((result) => {
      if (!cancelled) setSettled(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user, includeForks, key]);

  const data = settled?.kind === "ok" ? settled : null;
  const enriched = useMemo(
    () => (data ? data.data.repos.map((repo) => enrichRepo(repo, data.now)) : []),
    [data],
  );
  const rendered = useMemo(() => selectRendered(enriched), [enriched]);
  const renderedIds = useMemo(() => new Set(rendered.map((repo) => repo.id)), [rendered]);

  const filtersActive = query.trim() !== "" || statuses.size > 0;
  const visible = useMemo(() => filterRepos(enriched, { query, statuses }), [enriched, query, statuses]);

  useEffect(() => {
    setMatchingIds(filtersActive ? new Set(visible.map((repo) => repo.id)) : null);
  }, [filtersActive, visible, setMatchingIds]);

  const sceneActive = webgl && !sceneFailed;

  // Esc and Space skip the intro. Esc closes the panel afterwards.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const state = useGraveyard.getState();
      const target = event.target as HTMLElement;
      const typing = target.matches?.("input, textarea, button, a");
      if (sceneActive && state.introActive && data) {
        if (event.key === "Escape" || (event.key === " " && !typing)) {
          event.preventDefault();
          state.requestSkip();
        }
        return;
      }
      if (event.key === "Escape" && state.selectedId !== null) state.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sceneActive, data]);

  const retry = () => setAttempt((value) => value + 1);

  if (!settled || (settled.kind === "error" && settled.key !== key)) {
    return <LoadingSequence />;
  }

  if (settled.kind === "error") {
    if (settled.code === "invalid_username" || settled.code === "user_not_found") {
      return (
        <StateMessage
          title="No such grave keeper"
          actions={
            <Link href="/" className="control">
              Try another username
            </Link>
          }
        >
          <p>{settled.message}</p>
        </StateMessage>
      );
    }
    if (settled.code === "not_configured" || settled.code === "invalid_token") {
      return (
        <StateMessage title="GitHub token needed" actions={<RetryButton onRetry={retry} />}>
          <p>{settled.message}</p>
        </StateMessage>
      );
    }
    if (settled.code === "rate_limited") {
      return (
        <StateMessage
          title="GitHub rate limit reached"
          actions={<RetryButton retryAfter={settled.retryAfter} onRetry={retry} />}
        >
          <p>{settled.message} The button unlocks when the limit resets.</p>
        </StateMessage>
      );
    }
    return (
      <StateMessage title="GitHub didn't answer" actions={<RetryButton onRetry={retry} />}>
        <p>{settled.message}</p>
      </StateMessage>
    );
  }

  const { data: response } = settled;

  if (response.repos.length === 0) {
    if (response.forkCount > 0 && !includeForks) {
      return (
        <StateMessage
          title="Only forks here"
          actions={
            <button type="button" className="control" onClick={() => setIncludeForks(true)}>
              Show {response.forkCount.toLocaleString("en-US")} forks
            </button>
          }
        >
          <p>Every repository on {response.username} is a fork, and forks are hidden by default.</p>
        </StateMessage>
      );
    }
    return (
      <StateMessage title="Nothing buried yet">
        <p>{response.username} has no repositories.</p>
      </StateMessage>
    );
  }

  const notices = [
    enriched.length > MAX_RENDERED_GRAVES
      ? `The cemetery shows the top ${MAX_RENDERED_GRAVES} of ${enriched.length} repositories by stars and recent pushes. This list has them all.`
      : null,
    response.truncated ? "This account has more repositories than the 500 fetched." : null,
  ].filter(Boolean);

  const list = (
    <>
      {notices.map((notice) => (
        <p key={notice} className="border-b border-lichen/20 p-3 text-sm text-lichen">
          {notice}
        </p>
      ))}
      <RepoList repos={visible} />
    </>
  );

  const bar = (
    <ExploreBar
      includeForks={includeForks}
      onToggleForks={() => setIncludeForks((value) => !value)}
      forkCount={response.forkCount}
    />
  );
  const hud = <Hud username={response.username} repoCount={enriched.length} stale={response.stale} />;

  if (!sceneActive) {
    return (
      <main className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-2 p-2">
        <div className="pointer-events-none">{hud}</div>
        <p role="status" className="px-1 text-lichen">
          The 3D cemetery can&apos;t run in this browser, so here is every repository as a list.
        </p>
        <div>{bar}</div>
        <div className="slab flex-1">{list}</div>
        <RepoPanel repos={enriched} sceneActive={false} isRendered={(id) => renderedIds.has(id)} />
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-night">
      <div className="intro-fade absolute inset-0">
        <GraveyardCanvas
          username={response.username}
          repos={rendered}
          onFailure={() => setSceneFailed(true)}
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 52%, rgb(5 7 20 / 0.62) 100%)" }}
      />

      <div
        className={`hud-fade pointer-events-none absolute inset-0 z-20 flex flex-col justify-between gap-2 p-2 ${hudVisible ? "opacity-100" : "invisible opacity-0"}`}
      >
        {hud}
        {bar}
      </div>

      {viewMode === "list" && hudVisible && (
        <nav
          aria-label="Repositories"
          className="slab absolute top-16 bottom-28 left-2 z-20 w-[min(22rem,calc(100vw-1rem))] overflow-y-auto"
        >
          {list}
        </nav>
      )}

      <RepoPanel repos={enriched} sceneActive isRendered={(id) => renderedIds.has(id)} />

      {introActive && (
        <button
          type="button"
          className="control slab absolute right-3 bottom-3 z-30"
          onClick={() => useGraveyard.getState().requestSkip()}
        >
          <SkipForward aria-hidden="true" size={16} />
          Skip intro
        </button>
      )}
    </main>
  );
}
