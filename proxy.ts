import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { resolveSiteIdForHost } from "@/lib/customDomainLookup";

// Multi-tenant custom domains: a request to a connected/purchased domain
// (anything that isn't this app's own vercel.app deployment or localhost)
// gets transparently rewritten to the matching site's page — the visitor
// never sees /site/[id] in their address bar. API routes are left alone so
// they keep working the same regardless of which domain served the page.
function isOwnHost(host: string): boolean {
  return host.endsWith(".vercel.app") || host.startsWith("localhost");
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (!isOwnHost(host) && !pathname.startsWith("/api/") && !pathname.startsWith("/_next")) {
    const siteId = await resolveSiteIdForHost(host);
    const url = request.nextUrl.clone();
    if (siteId) {
      url.pathname = `/site/${siteId}`;
      return NextResponse.rewrite(url);
    }
    // Unrecognized custom domain — never fall through to serving this
    // app's own marketing homepage under someone else's domain.
    url.pathname = "/domain-not-connected";
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
