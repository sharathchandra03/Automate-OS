import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { HAS_SUPABASE } from "@/lib/config";

/** All protected path prefixes (without trailing slash) */
const PROTECTED_PATHS = [
  "/overview",
  "/leads",
  "/campaigns",
  "/appointments",
  "/tickets",
  "/faq",
  "/follow-ups",
  "/analytics",
  "/connect",
  "/automations",
  "/team",
  "/settings",
  "/admin",
  "/ai-assistant",
  "/api-keys",
  "/billing",
  "/contacts",
  "/inbox",
  "/insights",
  "/knowledge",
  "/notifications",
  "/reports",
  "/retargeting",
  "/templates",
  "/wallet",
  "/webhooks",
  "/workflow-builder",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

function addSecurityHeaders(response: NextResponse, host: string): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Only add HSTS on non-localhost environments
  if (!host.includes("localhost")) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Demo / no-Supabase mode: allow everything through, just add security headers
  if (!HAS_SUPABASE) {
    const response = NextResponse.next({ request });
    return addSecurityHeaders(response, host);
  }

  // --- Supabase SSR session refresh (required by @supabase/ssr) ---
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() must be called (not getSession()) - it validates the
  // JWT against the Supabase Auth server and refreshes the session token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Route protection ---
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the original destination so we can redirect after login
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(redirectResponse, host);
  }

  // --- Security headers on all passing responses ---
  return addSecurityHeaders(supabaseResponse, host);
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets (svg, png, jpg, jpeg, gif, webp, ico, woff, woff2)
     *  - /api/webhooks/* (inbound webhooks must not require auth)
     *  - /auth/callback  (Supabase OAuth callback)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)(?:\\?.*)?$|api/webhooks/|auth/callback).*)",
  ],
};
