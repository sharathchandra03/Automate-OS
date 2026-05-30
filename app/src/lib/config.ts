export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AutomateOS";
export const APP_TAGLINE = "One platform. Many businesses. Many automations.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Backend Express server URL (used by frontend to call API routes)
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

// Meta App credentials (App ID is public - needed by FB SDK on client)
export const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? "";
export const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID ?? "";

export const CREDENTIAL_KEY = process.env.CREDENTIAL_KEY ?? "";

export const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const DEMO_MODE = !HAS_SUPABASE;

export const INDUSTRIES = [
  "Real Estate",
  "Clinic / Healthcare",
  "Coaching / Education",
  "Marketing Agency",
  "E-commerce",
  "Salon / Spa",
  "Gym / Fitness",
  "Consultancy",
  "Service Business",
  "SaaS Company",
  "Local Business",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const PIPELINE_STAGES = [
  { id: "new", label: "New", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-indigo-500" },
  { id: "qualified", label: "Qualified", color: "bg-violet-500" },
  { id: "proposal", label: "Proposal", color: "bg-amber-500" },
  { id: "won", label: "Won", color: "bg-emerald-500" },
  { id: "lost", label: "Lost", color: "bg-rose-500" },
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number]["id"];
