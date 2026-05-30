import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/config";

/**
 * Supabase Auth callback - exchanges the one-time `code` query parameter for
 * a session and then redirects the user into the app.
 *
 * Supabase sends users here after:
 *   - Email confirmation on sign-up
 *   - Magic-link sign-in
 *   - OAuth provider redirect
 *
 * The redirect_to URL must be listed in your Supabase project's
 * "Redirect URLs" allowlist (Authentication → URL Configuration).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/overview";

  if (code) {
    const supabase = createSupabaseServerClient();

    if (!supabase) {
      // No Supabase configured - redirect straight through (demo mode)
      return NextResponse.redirect(`${origin}${next}`);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Use APP_URL as the base so the redirect works behind a reverse-proxy
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${APP_URL}${next}`);
      }
    }
  }

  // No code or exchange failed - redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
