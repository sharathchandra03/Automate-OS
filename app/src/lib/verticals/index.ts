/**
 * Vertical packs - per-industry adaptation of:
 *   - copy / labels (UI strings)
 *   - default pipeline stages
 *   - default automations to enable
 *   - recommended integrations
 *   - dashboard KPIs
 *   - default AI prompts
 *   - default templates
 *   - onboarding questions
 *
 * The active vertical is set during onboarding and stored on the org.
 * All downstream UI reads from `useVertical()` - never hard-codes vertical strings.
 */

import { realEstatePack } from "./real-estate";
import { clinicPack } from "./clinic";
import { agencyPack } from "./agency";
import { ecommercePack } from "./ecommerce";
import { educationPack } from "./education";
import { legalPack } from "./legal";
import { gymPack } from "./gym";
import { restaurantPack } from "./restaurant";
import { salonPack } from "./salon";
import { saasPack } from "./saas";
import { coachingPack } from "./coaching";
import { consultantPack } from "./consultant";
import { localServicesPack } from "./local-services";
import { genericPack } from "./generic";

export type VerticalId =
  | "real-estate" | "clinic" | "agency" | "ecommerce" | "education"
  | "legal" | "gym" | "restaurant" | "salon" | "saas"
  | "coaching" | "consultant" | "local-services" | "generic";

export interface KPIDef {
  key: string;
  label: string;
  description?: string;
  format: "number" | "currency" | "percent" | "duration";
  good: "up" | "down";
}

export interface AutomationSuggestion {
  id: string;
  name: string;
  description: string;
  trigger: string;
  /** action keys consumed by lib/n8n.ts */
  actions: string[];
  recommended: boolean;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  channel: "whatsapp" | "email" | "sms";
  body: string;
}

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: "text" | "select" | "multi-select" | "number";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface VerticalPack {
  id: VerticalId;
  name: string;
  emoji: string;
  tagline: string;
  copy: {
    leadsLabel: string;       // "Leads" → "Buyers" / "Patients" / "Students"
    leadSingular: string;
    contactLabel: string;
    appointmentLabel: string; // "Appointment" → "Tour" / "Consultation"
    pipelineStages: string[]; // e.g. ["New", "Contacted", "Showing", "Offer", "Closed"]
  };
  kpis: KPIDef[];
  recommendedIntegrations: string[];
  automations: AutomationSuggestion[];
  campaignTemplates: CampaignTemplate[];
  onboardingQuestions: OnboardingQuestion[];
  aiPersona: string;          // system prompt fragment
}

export const VERTICALS: Record<VerticalId, VerticalPack> = {
  "real-estate":   realEstatePack,
  "clinic":        clinicPack,
  "agency":        agencyPack,
  "ecommerce":     ecommercePack,
  "education":     educationPack,
  "legal":         legalPack,
  "gym":           gymPack,
  "restaurant":    restaurantPack,
  "salon":         salonPack,
  "saas":          saasPack,
  "coaching":      coachingPack,
  "consultant":    consultantPack,
  "local-services":localServicesPack,
  "generic":       genericPack,
};

export const VERTICAL_LIST: VerticalPack[] = Object.values(VERTICALS);

export function getVertical(id?: string | null): VerticalPack {
  if (!id) return genericPack;
  return (VERTICALS as Record<string, VerticalPack>)[id] ?? genericPack;
}
