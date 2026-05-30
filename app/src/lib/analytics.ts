import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function trackEvent(
  orgId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await svc().from("analytics_events").insert({
      organization_id: orgId,
      event,
      properties,
    });
  } catch {
    // analytics must never crash the caller
  }
}
