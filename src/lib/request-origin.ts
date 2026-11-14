import type { NextRequest } from "next/server";

/**
 * The origin the visitor actually used. On Netlify, `req.url` can carry the
 * per-deploy hostname instead of the site's domain, which would send people
 * to a different host than the one their session cookie lives on.
 */
export function getRequestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host.split(",")[0].trim()}`;
  }
  return new URL(req.url).origin;
}
