"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { getOrganization, updateOrganization } from "@/lib/api";
import { INDUSTRIES } from "@/lib/config";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["organization"], queryFn: getOrganization });

  const update = useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organization"] }); toast.success("Settings saved"); },
  });

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update.mutate({
      name: String(fd.get("name")),
      industry: String(fd.get("industry")),
      timezone: String(fd.get("timezone")),
      brand_color: String(fd.get("brand_color")),
      business_hours: String(fd.get("business_hours")),
    });
  }

  // Branding tab state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#5B5BF7");
  const [aiTone, setAiTone] = useState("professional");

  useEffect(() => {
    if (org) {
      if (org.logo_url) setLogoUrl(org.logo_url);
      if (org.brand_color) setBrandColor(org.brand_color);
      if (org.ai_tone) setAiTone(org.ai_tone);
    }
  }, [org]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: form });
    const { url, error } = await res.json();
    if (url) {
      setLogoUrl(url);
      qc.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Logo uploaded");
    } else {
      toast.error(error ?? "Upload failed");
    }
  }

  async function handleSaveBranding() {
    update.mutate({ brand_color: brandColor, ai_tone: aiTone });
  }

  // Team tab state
  const [members, setMembers] = useState<{ id: string; email: string; full_name: string; role: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetch("/api/team").then((r) => r.json()).then((d) => setMembers(d.members ?? []));
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: "member" }),
      });
      if (res.ok) {
        toast.success(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Invite failed");
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, role: newRole }),
    });
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
  }

  if (!org) return null;

  return (
    <>
      <PageHeader title="Settings" description="Business profile, branding, and platform preferences." />

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="hours">Hours & Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card><CardHeader><CardTitle>Business profile</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={onSave} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="name">Business name</Label><Input id="name" name="name" defaultValue={org.name} /></div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select id="industry" name="industry" defaultValue={org.industry}>
                      {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select id="timezone" name="timezone" defaultValue={org.timezone}>
                      <option>America/New_York</option><option>Europe/London</option><option>Asia/Kolkata</option><option>Asia/Singapore</option><option>Australia/Sydney</option>
                    </Select>
                  </div>
                  <div><Label htmlFor="business_hours">Business hours</Label><Input id="business_hours" name="business_hours" defaultValue={org.business_hours ?? ""} /></div>
                </div>
                <div>
                  <Label htmlFor="brand_color">Brand color</Label>
                  <div className="flex items-center gap-3">
                    <Input id="brand_color" name="brand_color" type="color" defaultValue={org.brand_color} className="h-10 w-20 p-1" />
                    <span className="text-sm text-muted-foreground">{org.brand_color}</span>
                  </div>
                </div>
                <Button type="submit" loading={update.isPending} leftIcon={<Save className="h-4 w-4" />}>Save changes</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand">
          <Card><CardHeader><CardTitle>Branding</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-2xl">
                <div>
                  <Label>Logo</Label>
                  {logoUrl && <img src={logoUrl} alt="logo" className="h-12 mb-2 rounded" />}
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                </div>
                <div>
                  <Label>Brand colour</Label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-20 rounded border border-border cursor-pointer"
                  />
                </div>
                <div>
                  <Label>AI tone</Label>
                  <Select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                  </Select>
                </div>
                <Button onClick={handleSaveBranding} loading={update.isPending}>Save branding</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card><CardHeader><CardTitle>Team members</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-2xl">
                <div>
                  <Label>Invite by email</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    />
                    <Button onClick={handleInvite} loading={inviting}>Invite</Button>
                  </div>
                </div>

                {members.length > 0 && (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{m.full_name || m.email}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <Select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="w-32"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card><CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Configure pipeline stages and SLA windows. (v1 ships with the standard 6-stage pipeline.)</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
