import type { ApiErrorCode } from "../types";

const HTTP_STATUS: Record<ApiErrorCode, number> = {
  invalid_username: 400,
  not_found: 404,
  rate_limited: 429,
  upstream_error: 502,
  timeout: 504,
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
