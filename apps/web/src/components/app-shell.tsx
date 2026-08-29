import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Radio, Settings, ShieldCheck, Users } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { SignOutButton } from "./sign-out-button";
import { getViewerContext, viewerCanManage } from "@/lib/viewer-context";

export async function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const viewer = await getViewerContext();
  const activeEvent = viewer?.activeEvent;
  const canManage = viewerCanManage(viewer);
  const eventHref = activeEvent ? `/events/${activeEvent.event_key}` : "/events";
  const navigation = [
    ["Workspace", [["Dashboard", "/dashboard", LayoutDashboard], ["Events", "/events", CalendarDays], ["Teams", `${eventHref}/teams`, Users], ["Matches", `${eventHref}/matches`, ClipboardList]]],
    ["Scout", [["My assignments", "/scout/assignments", Radio], ["Scouting forms", "/scout/manual", ClipboardList], ["Submissions", "/submissions", BarChart3]]],
    ...(canManage ? [["Admin", [["Event import", "/admin/sync", ClipboardList], ["Assignments", "/admin/assignments", Radio], ["Users & roles", "/admin/users", ShieldCheck], ["Form builder", "/admin/forms", Settings]]] as const] : []),
  ] as const;
  return <div className="shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><BrandLogo/><span className="brand-copy">wildcard<small>STUYPULSE · 694</small></span></Link>
    <nav className="nav-links" aria-label="Primary navigation">{navigation.map(([label, items]) => <div className="nav-section" key={label}><div className="nav-label">{label}</div>{items.map(([name, href, Icon]) => <Link aria-label={name} className={`nav-item ${name === active || (name === "Scouting forms" && active === "Manual scouting") ? "active" : ""}`} href={href} key={name}><Icon size={17}/><span>{name}</span></Link>)}</div>)}</nav>
    <SignOutButton />
  </aside><main className="main">{children}</main></div>;
}

export async function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  const activeEvent = (await getViewerContext())?.activeEvent;
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="topbar-actions">{children}<div className="event-chip"><span className={activeEvent ? "online" : "offline"}/><span>Active event:</span><strong>{activeEvent?.name ?? "None selected"}</strong></div></div></div>;
}
