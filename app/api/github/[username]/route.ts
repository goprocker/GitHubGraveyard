import { NextResponse } from "next/server";

import { excludeForks } from "@/lib/filter";
import { getRepos } from "@/lib/github/cache";
import { GitHubError } from "@/lib/github/errors";
import type { ApiErrorBody, GraveyardResponse } from "@/lib/types";
import { isValidUsername, normalizeUsername } from "@/lib/username";

function errorResponse(error: GitHubError): NextResponse<ApiErrorBody> {
  const headers = new Headers({
    "Cache-Control": error.code === "not_found" ? "public, s-maxage=60" : "no-store",
  });
  if (error.retryAfter !== undefined) headers.set("Retry-After", String(error.retryAfter));
  return NextResponse.json(
    { error: { code: error.code, message: error.message, retryAfter: error.retryAfter } },
    { status: error.httpStatus, headers },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
): Promise<NextResponse<GraveyardResponse | ApiErrorBody>> {
  const { username } = await context.params;

  if (!isValidUsername(username)) {
    return errorResponse(
      new GitHubError(
        "invalid_username",
        "GitHub usernames contain only letters, numbers and hyphens, up to 39 characters.",
      ),
    );
  }

  const includeForks = new URL(request.url).searchParams.get("includeForks") === "true";

  try {
    const { repos, truncated, fetchedAt, stale } = await getRepos(username);
    const visible = includeForks ? repos : excludeForks(repos);
    const body: GraveyardResponse = {
      username: normalizeUsername(username),
      repos: visible,
      forkCount: repos.length - excludeForks(repos).length,
      includeForks,
      truncated,
      fetchedAt: new Date(fetchedAt).toISOString(),
      stale,
    };
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": stale
          ? "no-store"
          : "public, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    if (error instanceof GitHubError) return errorResponse(error);
    return errorResponse(new GitHubError("upstream_error", "The repositories could not be loaded."));
  }
}
