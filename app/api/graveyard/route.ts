import { NextResponse } from "next/server";

import { excludeForks } from "@/lib/filter";
import { getRepos } from "@/lib/github/cache";
import { GitHubError } from "@/lib/github/errors";
import type { ApiErrorBody, GraveyardResponse } from "@/lib/types";

// Responses can name private repositories, so no shared cache may ever store them.
const NO_STORE = "private, no-store";

function errorResponse(error: GitHubError): NextResponse<ApiErrorBody> {
  const headers = new Headers({ "Cache-Control": NO_STORE });
  if (error.retryAfter !== undefined) headers.set("Retry-After", String(error.retryAfter));
  return NextResponse.json(
    { error: { code: error.code, message: error.message, retryAfter: error.retryAfter } },
    { status: error.httpStatus, headers },
  );
}

export async function GET(request: Request): Promise<NextResponse<GraveyardResponse | ApiErrorBody>> {
  const params = new URL(request.url).searchParams;
  const includeForks = params.get("includeForks") === "true";
  const user = params.get("user")?.trim() || undefined;

  try {
    const { username, repos, truncated, fetchedAt, stale } = await getRepos(user);
    const body: GraveyardResponse = {
      username,
      repos: includeForks ? repos : excludeForks(repos),
      forkCount: repos.length - excludeForks(repos).length,
      includeForks,
      truncated,
      fetchedAt: new Date(fetchedAt).toISOString(),
      stale,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": NO_STORE } });
  } catch (error) {
    if (error instanceof GitHubError) return errorResponse(error);
    return errorResponse(new GitHubError("upstream_error", "The repositories could not be loaded."));
  }
}
