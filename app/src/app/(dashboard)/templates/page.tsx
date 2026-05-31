"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Sparkles, Star, Download, Clock, CheckCircle, Loader2 } from "lucide-react";
import { listTemplates, type MarketplaceTemplate } from "@/lib/templates";
import type { VerticalId } from "@/lib/verticals";
import { VERTICAL_LIST } from "@/lib/verticals";
import { installTemplate, type InstallResult } from "@/lib/template-install";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [vertical, setVertical] = useState<VerticalId | "all">("all");
  const [category, setCategory] = useState<MarketplaceTemplate["category"] | "all">("all");
  const [tier, setTier] = useState<"all" | "free" | "paid">("all");
  const [installing, setInstalling] = useState<string | null>(null);
  const [result, setResult] = useState<{ template: MarketplaceTemplate; data: InstallResult } | null>(null);

  const templates = useMemo(() => listTemplates({
    vertical: vertical === "all" ? null : vertical,
    category: category === "all" ? undefined : category,
    free: tier === "all" ? undefined : tier === "free",
  }), [vertical, category, tier]);

  async function handleInstall(t: MarketplaceTemplate) {
    setInstalling(t.id);
    try {
      const data = await installTemplate(t.id);
      setResult({ template: t, data });
    } catch {
      toast.error(`Failed to install ${t.name}`);
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Template marketplace"
        description="Pre-built workflows, campaigns, and automations - installable in minutes."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Industry</p>
            <Select value={vertical} onChange={(e) => setVertical(e.target.value as VerticalId | "all")}>
              <option value="all">All industries</option>
              {VERTICAL_LIST.map((v) => <option key={v.id} value={v.id}>{v.emoji} {v.name}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <Select value={category} onChange={(e) => setCategory(e.target.value as MarketplaceTemplate["category"] | "all")}>
              <option value="all">All</option>
              <option value="lead-gen">Lead generation</option>
              <option value="campaigns">Campaigns</option>
              <option value="support">Support</option>
              <option value="ops">Operations</option>
              <option value="analytics">Analytics</option>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pricing</p>
            <Select value={tier} onChange={(e) => setTier(e.target.value as "all" | "free" | "paid")}>
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{templates.length} templates</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-1">{t.name}</CardTitle>
                {t.free ? <Badge tone="success">Free</Badge> : <Badge tone="primary">${t.priceUsd}</Badge>}
              </div>
              <CardDescription className="line-clamp-2">{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-1">
                <Badge tone="muted">{t.category}</Badge>
                {t.verticals.slice(0, 2).map((v) => <Badge key={v} tone="info">{v}</Badge>)}
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {t.installs_what.map((i) => <li key={i}>• {i}</li>)}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span><Star className="mr-1 inline h-3 w-3 fill-amber-500 text-amber-500" /> {t.rating}</span>
                <span><Download className="mr-1 inline h-3 w-3" /> {t.installs.toLocaleString()}</span>
                <span><Clock className="mr-1 inline h-3 w-3" /> ~{t.estSetupMinutes} min</span>
              </div>
              <Button
                leftIcon={installing === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                disabled={installing !== null}
                onClick={() => handleInstall(t)}
              >
                {installing === t.id ? "Installing…" : "Install"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {result && (
        <Modal
          open={true}
          onClose={() => setResult(null)}
          title={`"${result.template.name}" installed`}
          description="The following items were created in your workspace."
          size="md"
          footer={<Button onClick={() => setResult(null)}>Done</Button>}
        >
          <div className="space-y-4 text-sm">
            {result.data.automations.length > 0 && (
              <Section label="Automations" href="/automations" items={result.data.automations.map((a) => a.name)} />
            )}
            {result.data.campaigns.length > 0 && (
              <Section label="Campaigns" href="/campaigns" items={result.data.campaigns.map((c) => c.name)} />
            )}
            {result.data.faq.length > 0 && (
              <Section label="FAQ items" href="/faq" items={result.data.faq.map((f) => f.question)} />
            )}
            {result.data.followUps.length > 0 && (
              <Section label="Follow-up sequences" href="/follow-ups" items={result.data.followUps.map((f) => f.name)} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({ label, href, items }: { label: string; href: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-foreground">{label}</p>
        <Link href={href} className="text-xs text-primary hover:underline">View all →</Link>
      </div>
      <ul className="space-y-1">
        {items.map((name) => (
          <li key={name} className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
