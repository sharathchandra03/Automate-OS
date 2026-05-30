"use client";

import * as React from "react";
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

  if (!org) return null;

  return (
    <>
      <PageHeader title="Settings" description="Business profile, branding, and platform preferences." />

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
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
          <Card><CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Upload a logo, customize the booking page theme, set tone-of-voice for AI replies, and configure email signatures. (Coming soon - placeholder for v1.)</p>
          </CardContent></Card>
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
