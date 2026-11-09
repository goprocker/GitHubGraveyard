import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "../../proxy";

function request(authorization?: string): NextRequest {
  return new NextRequest("http://localhost/graveyard", {
    headers: authorization ? { authorization } : {},
  });
}

function basic(credentials: string): string {
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

describe("password gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the password with any username", () => {
    vi.stubEnv("GRAVEYARD_PASSWORD", "s3cret:with-colon");
    expect(proxy(request(basic("anyone:s3cret:with-colon"))).status).toBe(200);
  });

  it("accepts a non-ASCII password sent as UTF-8", () => {
    vi.stubEnv("GRAVEYARD_PASSWORD", "tombé☠");
    expect(proxy(request(basic("me:tombé☠"))).status).toBe(200);
  });

  it.each([
    ["no header", undefined],
    ["a wrong password", basic("me:wrong")],
    ["a password prefix", basic("me:s3cre")],
    ["malformed base64", "Basic %%%"],
    ["another scheme", "Bearer s3cret"],
  ])("challenges %s", (_name, authorization) => {
    vi.stubEnv("GRAVEYARD_PASSWORD", "s3cret");
    const response = proxy(request(authorization));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
  });

  it("serves openly in production without a password", () => {
    vi.stubEnv("GRAVEYARD_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(proxy(request()).status).toBe(200);
  });
});
