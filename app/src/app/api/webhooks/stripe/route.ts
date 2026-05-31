import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function planFromPriceId(priceId: string): string {
  const { STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_PRO } = process.env;
  if (priceId === STRIPE_PRICE_STARTER) return "starter";
  if (priceId === STRIPE_PRICE_GROWTH)  return "growth";
  if (priceId === STRIPE_PRICE_PRO)     return "pro";
  return "free";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = svc();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { metadata?: Record<string, string>; customer?: string; subscription?: string };
      const orgId = session.metadata?.organization_id;
      const plan  = session.metadata?.plan ?? "starter";
      if (!orgId) break;

      await supabase.from("subscriptions").upsert({
        organization_id: orgId,
        stripe_customer_id: session.customer ?? null,
        stripe_subscription_id: session.subscription ?? null,
        plan,
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });

      await supabase.from("organizations").update({ plan }).eq("id", orgId);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as {
        id: string; status: string; cancel_at_period_end: boolean;
        current_period_end: number; items: { data: { price: { id: string } }[] };
      };
      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = event.type === "customer.subscription.deleted" ? "free" : planFromPriceId(priceId);

      await supabase.from("subscriptions").update({
        plan,
        status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("stripe_subscription_id", sub.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as { subscription?: string };
      if (invoice.subscription) {
        await supabase.from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
