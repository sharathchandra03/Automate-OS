"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ShieldCheck, Headphones, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/config";

// ── Schema ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Mode config ───────────────────────────────────────────────────────────────

const MODES = [
  {
    id:          "admin" as const,
    label:       "Admin Login",
    icon:        ShieldCheck,
    description: "Full platform access - dashboard, campaigns, billing, team management, and all settings.",
    redirect:    "/overview",
    features:    ["Full dashboard & analytics", "Campaign management", "Team & billing settings", "API keys & integrations"],
  },
  {
    id:          "agent" as const,
    label:       "Agent Login",
    icon:        Headphones,
    description: "Agent workspace - your inbox, assigned contacts, appointments, and support tickets.",
    redirect:    "/inbox",
    features:    ["Unified inbox", "Contact management", "Appointments", "Support tickets"],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]       = React.useState<"admin" | "agent">("admin");
  const [showPwd, setShowPwd] = React.useState(false);

  const currentMode = MODES.find((m) => m.id === mode)!;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email:    DEMO_MODE ? "demo@automateos.app" : "",
      password: DEMO_MODE ? "demo1234" : "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      // Demo mode - set role and redirect
      if (typeof window !== "undefined") localStorage.setItem("userRole", mode);
      toast.success(`Signed in as ${mode} (demo)`);
      router.push(currentMode.redirect);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email:    values.email,
      password: values.password,
    });

    if (error) { toast.error(error.message); return; }

    // Store chosen role so dashboard can filter nav accordingly
    if (typeof window !== "undefined") localStorage.setItem("userRole", mode);
    router.push(currentMode.redirect);
  }

  const ModeIcon = currentMode.icon;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">

        {/* Mode tabs */}
        <div className="grid grid-cols-2 border-b border-border">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="p-8">
          {/* Mode description */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ModeIcon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{currentMode.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{currentMode.description}</p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {currentMode.features.map((f) => (
                  <li key={f} className="text-[10px] text-primary/70 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {DEMO_MODE && (
            <p className="mb-4 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Demo mode - credentials are pre-filled. No Supabase connection required.
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>Sign in as {mode === "admin" ? "Admin" : "Agent"} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">Create workspace</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
