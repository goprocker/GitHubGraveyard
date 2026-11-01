import { NextResponse, type NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i % (b.length || 1));
  }
  return difference === 0;
}

/** Private repository names are served here, so every route requires the owner's password. */
export function proxy(request: NextRequest) {
  const password = process.env.GRAVEYARD_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Set GRAVEYARD_PASSWORD to serve this site.", { status: 503 });
  }

  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    try {
      // atob yields one character per byte, and browsers send credentials as UTF-8.
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)));
      if (safeEqual(decoded.slice(decoded.indexOf(":") + 1), password)) return NextResponse.next();
    } catch {
      // Malformed credentials fall through to the challenge below.
    }
  }
  return new NextResponse("Password required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GitHub Graveyard"', "Cache-Control": "no-store" },
  });
}
