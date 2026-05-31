const REQUIRED_SERVER = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const OPTIONAL_WARN = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
];

export function validateEnv() {
  if (typeof window !== "undefined") return; // client — skip

  const missing = REQUIRED_SERVER.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const missingOpt = OPTIONAL_WARN.filter((k) => !process.env[k]);
  if (missingOpt.length) {
    console.warn("[env] Optional vars not set (some features disabled):", missingOpt.join(", "));
  }
}
