import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS for the API so the React Native Android app (a different origin) can call
 * it. By default we allow all origins for /api/* because this is a single-user,
 * self-hosted tool and the API holds no third-party secrets in responses. To
 * lock it down, set ALLOWED_ORIGIN in the backend env to your app's origin.
 */
export function middleware(req: NextRequest) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";

  // Preflight.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(allowed) });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders(allowed))) res.headers.set(k, v);
  return res;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-worker-secret, x-api-key",
    "Access-Control-Max-Age": "86400",
  };
}

export const config = {
  matcher: "/api/:path*",
};
