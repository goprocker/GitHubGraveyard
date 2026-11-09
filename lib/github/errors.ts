import type { ApiErrorCode } from "../types";

const HTTP_STATUS: Record<ApiErrorCode, number> = {
  not_configured: 503,
  invalid_token: 503,
  rate_limited: 429,
  upstream_error: 502,
  timeout: 504,
  invalid_username: 400,
  user_not_found: 404,
};

export class GitHubError extends Error {
  readonly code: ApiErrorCode;
  readonly retryAfter?: number;

  constructor(code: ApiErrorCode, message: string, retryAfter?: number) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
    this.retryAfter = retryAfter;
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }
}
