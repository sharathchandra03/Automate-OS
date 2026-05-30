"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Menu, Moon, Search, Sun, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { DEMO_MODE } from "@/lib/config";
import { mockProfile, mockOrg } from "@/lib/mock-data";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search leads, campaigns, tickets…" className="pl-9 h-10" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {DEMO_MODE && (
          <Badge tone="info" className="hidden sm:inline-flex" dot>
            Demo mode
          </Badge>
        )}

        <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} className="hidden sm:inline-flex">
          Quick add
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {mounted ? (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : null}
        </Button>

        <Link href="/insights" className="hidden sm:inline-flex">
          <Button variant="ghost" size="sm" leftIcon={<Sparkles className="h-4 w-4 text-primary" />}>Insights</Button>
        </Link>

        <NotificationCenter />

        <div className="flex items-center gap-2.5 pl-2 border-l border-border ml-1">
          <Avatar name={mockProfile.full_name} size={32} />
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-medium">{mockProfile.full_name}</p>
            <p className="text-xs text-muted-foreground">{mockOrg.name}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
