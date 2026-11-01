export interface Repo {
  id: number;
  name: string;
  description: string | null;
  htmlUrl: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  private: boolean;
}

export type RepoStatus = "alive" | "forgotten" | "buried" | "ancient" | "archived";

export type PrestigeTier = "basic" | "decorative" | "elaborate" | "monument";

export interface EnrichedRepo extends Repo {
  status: RepoStatus;
  inactiveDays: number;
  /** True when GitHub returned no pushed_at and created_at was used instead. */
  usedCreatedDate: boolean;
  tier: PrestigeTier;
  epitaph: string;
}

export interface GraveyardResponse {
  username: string;
  repos: Repo[];
  forkCount: number;
  includeForks: boolean;
  /** True when the account has more repositories than the fetch limit. */
  truncated: boolean;
  fetchedAt: string;
  /** True when GitHub could not be reached and an expired cache entry was served. */
  stale: boolean;
}

export type ApiErrorCode =
  | "not_configured"
  | "invalid_token"
  | "rate_limited"
  | "upstream_error"
  | "timeout";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    retryAfter?: number;
  };
}

export interface GravePlacement {
  id: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
  variant: number;
  seed: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CemeteryLayout {
  graves: GravePlacement[];
  bounds: Bounds;
  center: { x: number; z: number };
  /** Distance from the center that contains every grave. */
  radius: number;
}

export interface ScatterItem {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  variant: number;
}

export interface Scenery {
  trees: ScatterItem[];
  rocks: ScatterItem[];
  grass: ScatterItem[];
}
