"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AIAssistantWidget } from "@/components/ai/AIAssistantWidget";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HAS_SUPABASE } from "@/lib/config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [role, setRole] = React.useState<"admin" | "agent">("admin");
  const [ready, setReady] = React.useState(!HAS_SUPABASE); // skip guard in demo mode

  React.useEffect(() => {
    const stored = localStorage.getItem("userRole");
    if (stored === "agent") setRole("agent");
  }, []);

  // Auth + org guard — runs once on mount
  React.useEffect(() => {
    if (!HAS_SUPABASE) return; // demo mode, no guard needed

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Check if user has an org yet
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        router.replace("/onboarding");
        return;
      }

      // Sync role from DB (more reliable than localStorage alone)
      const dbRole = profile.role === "member" || profile.role === "viewer" ? "agent" : "admin";
      localStorage.setItem("userRole", dbRole);
      setRole(dbRole);
      setReady(true);
    })();

    // Listen for sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block sticky top-0 h-screen">
        <Sidebar role={role} />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full animate-slide-up">
            <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 mx-auto w-full max-w-screen-2xl")}>
          {children}
        </main>
      </div>

      <AIAssistantWidget />
    </div>
  );
}
