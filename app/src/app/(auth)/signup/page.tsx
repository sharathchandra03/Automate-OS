"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, User, Phone, Mail, Lock, AtSign, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/config";

// ── Schema ────────────────────────────────────────────────────────────────────

const vendorSchema = z
  .object({
    vendor_name:      z.string().min(2, "Company name must be at least 2 characters"),
    username:         z.string()
                       .min(3, "Username must be at least 3 characters")
                       .max(30, "Username must be under 30 characters")
                       .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
    first_name:       z.string().min(1, "First name is required"),
    last_name:        z.string().min(1, "Last name is required"),
    mobile:           z.string()
                       .regex(/^\d{7,15}$/, "Enter mobile with country code, no + or 0 (e.g. 919876543210)"),
    email:            z.string().email("Enter a valid email address"),
    password:         z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type VendorFormValues = z.infer<typeof vendorSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router    = useRouter();
  const [confirmed, setConfirmed]   = React.useState(false);
  const [showPwd, setShowPwd]       = React.useState(false);
  const [showCPwd, setShowCPwd]     = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({ resolver: zodResolver(vendorSchema) });

  async function onSubmit(values: VendorFormValues) {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      toast.success("Vendor workspace created (demo mode)");
      router.push("/onboarding");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email:    values.email,
      password: values.password,
      options: {
        // After email confirmation, land on onboarding so the user can create their org
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        data: {
          vendor_name: values.vendor_name,
          username:    values.username,
          first_name:  values.first_name,
          last_name:   values.last_name,
          mobile:      values.mobile,
          role:        "admin",
        },
      },
    });

    if (error) { toast.error(error.message); return; }
    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card shadow-elevated p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            We sent a confirmation link to your inbox. Click it to activate your AutomateOS workspace and get started.
          </p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Go to Login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl border border-border bg-card shadow-elevated p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Register as Vendor / Company</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create your AutomateOS workspace in 2 minutes</p>
          {DEMO_MODE && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
              Demo mode - no Supabase connection required
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>

          {/* Section: Company */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Details</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div>
              <label htmlFor="vendor_name" className="block text-sm font-medium mb-1.5">
                Vendor / Company Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="vendor_name"
                  type="text"
                  placeholder="Acme Realty Pvt. Ltd."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  {...register("vendor_name")}
                />
              </div>
              {errors.vendor_name && <p className="mt-1 text-xs text-destructive">{errors.vendor_name.message}</p>}
            </div>
          </div>

          {/* Section: Admin User */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin User Details</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1.5">
                  Username <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="username"
                    type="text"
                    placeholder="acme_admin"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors lowercase"
                    {...register("username")}
                  />
                </div>
                {errors.username
                  ? <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>
                  : <p className="mt-1 text-xs text-muted-foreground">Lowercase letters, numbers, and underscores only</p>
                }
              </div>

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium mb-1.5">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="first_name"
                      type="text"
                      placeholder="Rahul"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      {...register("first_name")}
                    />
                  </div>
                  {errors.first_name && <p className="mt-1 text-xs text-destructive">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium mb-1.5">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    placeholder="Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    {...register("last_name")}
                  />
                  {errors.last_name && <p className="mt-1 text-xs text-destructive">{errors.last_name.message}</p>}
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium mb-1.5">
                  Mobile Number <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="mobile"
                    type="tel"
                    placeholder="919876543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    {...register("mobile")}
                  />
                </div>
                {errors.mobile
                  ? <p className="mt-1 text-xs text-destructive">{errors.mobile.message}</p>
                  : <p className="mt-1 text-xs text-muted-foreground">With country code, without + or leading 0 (e.g. 919876543210)</p>
                }
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="rahul@acmerealty.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    {...register("password")}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium mb-1.5">
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="confirm_password"
                    type={showCPwd ? "text" : "password"}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    {...register("confirm_password")}
                  />
                  <button type="button" onClick={() => setShowCPwd(!showCPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showCPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm_password && <p className="mt-1 text-xs text-destructive">{errors.confirm_password.message}</p>}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Creating workspace...
              </>
            ) : (
              <>Create Workspace <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          <p className="mt-3 text-xs text-center text-muted-foreground">
            By registering you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have a workspace?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
