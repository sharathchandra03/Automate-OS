"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { NAV, AGENT_NAV, type NavItem } from "./nav-config";
import { Badge } from "@/components/ui/Badge";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ── Hover flyout popup - rendered into document.body via portal ───────────────

function HoverFlyout({
  item,
  anchorY,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  item: NavItem;
  anchorY: number;
  onNavigate?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const pathname = usePathname();
  if (!item.children) return null;

  return createPortal(
    <div
      className="fixed z-[9999] ml-1.5"
      style={{ top: anchorY, left: 256 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="w-52 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
        </div>
        {/* Children */}
        <ul className="p-1.5 space-y-0.5">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const active = pathname === child.href || pathname?.startsWith(child.href + "/");
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span>{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ onNavigate, role = "admin" }: { onNavigate?: () => void; role?: "admin" | "agent" }) {
  const activeNav = role === "agent" ? AGENT_NAV : NAV;
  const pathname = usePathname();
  const [flyout, setFlyout] = useState<{ item: NavItem; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  function clearClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setFlyout(null), 150);
  }

  function handleItemEnter(item: NavItem, e: React.MouseEvent<HTMLLIElement>) {
    clearClose();
    if (!item.children) { setFlyout(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyout({ item, y: rect.top });
  }

  function isActive(href: string, children?: NavItem["children"]) {
    if (pathname === href) return true;
    if (children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + "/"))) return true;
    return false;
  }

  function hasActiveChild(children?: NavItem["children"]) {
    return children?.some((c) => pathname === c.href || pathname?.startsWith(c.href + "/")) ?? false;
  }

  return (
    <>
      <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center px-5 border-b border-border">
          <Logo />
        </div>

        {role === "agent" && (
          <div className="mx-3 my-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-primary font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Agent Workspace
          </div>
        )}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {activeNav.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.children);
                  const expanded = active || hasActiveChild(item.children);
                  const hasFlyoutChildren = !!item.children;

                  return (
                    <li
                      key={item.href}
                      onMouseEnter={(e) => handleItemEnter(item, e)}
                      onMouseLeave={scheduleClose}
                    >
                      <Link
                        href={item.children ? item.children[0]!.href : item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && <Badge tone="warning" className="ml-auto">{item.badge}</Badge>}
                        {hasFlyoutChildren && (
                          <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        )}
                      </Link>

                      {/* Inline sub-nav when path is active */}
                      {item.children && expanded && (
                        <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-3">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = pathname === child.href;
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={onNavigate}
                                  className={cn(
                                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                                    childActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                  )}
                                >
                                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/onboarding"
            className="flex items-center gap-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent p-3 text-sm hover:from-primary/15 transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="font-medium">Setup Wizard</p>
              <p className="text-xs text-muted-foreground">Connect & launch in 5 mins</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Portal flyout - always on top of everything */}
      {mounted && flyout && (
        <HoverFlyout
          item={flyout.item}
          anchorY={flyout.y}
          onNavigate={() => { setFlyout(null); onNavigate?.(); }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
}
