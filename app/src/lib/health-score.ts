/**
 * Customer health score - predicts churn risk and surfaces the "why".
 *
 * Inputs are normalized 0-1 weights, output is 0-100.
 * Each org defines its own weights via Settings (defaults below).
 */

export interface HealthInputs {
  loginsLast30d: number;     // raw logins
  apiCallsLast30d: number;
  automationsActive: number;
  ticketsOpenAging: number;  // open >24h
  npsLast?: number;          // -100 to 100
  paymentsOnTime: boolean;
  daysSinceLastActivity: number;
}

export interface HealthScore {
  score: number;              // 0-100
  band: "excellent" | "healthy" | "at_risk" | "critical";
  drivers: { label: string; impact: number; positive: boolean }[];
  churnRisk: number;          // 0-1
}

export function scoreHealth(inputs: HealthInputs): HealthScore {
  const drivers: { label: string; impact: number; positive: boolean }[] = [];
  let s = 50;

  // Engagement
  const engaged = clamp(inputs.loginsLast30d / 20, 0, 1);
  s += engaged * 25;
  drivers.push({ label: "Active usage", impact: Math.round(engaged * 25), positive: engaged > 0.3 });

  // Automation depth
  const auto = clamp(inputs.automationsActive / 8, 0, 1);
  s += auto * 15;
  drivers.push({ label: "Automation depth", impact: Math.round(auto * 15), positive: auto > 0.3 });

  // API integration depth
  const api = clamp(inputs.apiCallsLast30d / 1000, 0, 1);
  s += api * 10;
  drivers.push({ label: "API integration", impact: Math.round(api * 10), positive: api > 0.2 });

  // Inactivity penalty
  const stale = clamp(inputs.daysSinceLastActivity / 30, 0, 1);
  s -= stale * 25;
  drivers.push({ label: "Recency", impact: -Math.round(stale * 25), positive: stale < 0.3 });

  // Aging tickets penalty
  const aging = clamp(inputs.ticketsOpenAging / 5, 0, 1);
  s -= aging * 15;
  drivers.push({ label: "Open aging tickets", impact: -Math.round(aging * 15), positive: aging < 0.2 });

  // NPS
  if (typeof inputs.npsLast === "number") {
    const npsNorm = (inputs.npsLast + 100) / 200;
    s += (npsNorm - 0.5) * 20;
    drivers.push({ label: "NPS", impact: Math.round((npsNorm - 0.5) * 20), positive: npsNorm > 0.5 });
  }

  // Billing
  if (!inputs.paymentsOnTime) {
    s -= 15;
    drivers.push({ label: "Payment issues", impact: -15, positive: false });
  } else {
    drivers.push({ label: "Billing healthy", impact: 5, positive: true });
    s += 5;
  }

  s = clamp(Math.round(s), 0, 100);

  return {
    score: s,
    band: bandOf(s),
    churnRisk: clamp((100 - s) / 100, 0, 1),
    drivers: drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
  };
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function bandOf(s: number): HealthScore["band"] {
  if (s >= 80) return "excellent";
  if (s >= 60) return "healthy";
  if (s >= 40) return "at_risk";
  return "critical";
}

/** Build a deterministic-but-varied demo score for the current org. */
export function demoHealth(): HealthScore {
  return scoreHealth({
    loginsLast30d: 14,
    apiCallsLast30d: 350,
    automationsActive: 5,
    ticketsOpenAging: 1,
    npsLast: 35,
    paymentsOnTime: true,
    daysSinceLastActivity: 1,
  });
}
