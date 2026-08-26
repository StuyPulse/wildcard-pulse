import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Radio, Settings, ShieldCheck, Users } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { SignOutButton } from "./sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { getActiveEvent } from "@/lib/active-event";

export async function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const supabase = await createClient();
  const [{ data: { user } }, activeEvent] = await Promise.all([supabase.auth.getUser(), getActiveEvent()]);
  const { data: membership } = user ? await supabase.from("organization_members").select("role").eq("user_id", user.id).in("role", ["admin", "developer"]).limit(1).maybeSingle() : { data: null };
  const eventHref = activeEvent ? `/events/${activeEvent.event_key}` : "/events";
  const navigation = [
    ["Workspace", [["Dashboard", "/dashboard", LayoutDashboard], ["Events", "/events", CalendarDays], ["Teams", `${eventHref}/teams`, Users], ["Matches", `${eventHref}/matches`, ClipboardList]]],
    ["Scout", [["My assignments", "/scout/assignments", Radio], ["Scouting forms", "/scout/manual", ClipboardList], ["Submissions", "/submissions", BarChart3]]],
    ...(membership ? [["Admin", [["Event import", "/admin/sync", ClipboardList], ["Assignments", "/admin/assignments", Radio], ["Users & roles", "/admin/users", ShieldCheck], ["Form builder", "/admin/forms", Settings]]] as const] : []),
  ] as const;
  return <div className="shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><BrandLogo/><span className="brand-copy">pulse<small>STUYPULSE · 694</small></span></Link>
    <nav className="nav-links" aria-label="Primary navigation">{navigation.map(([label, items]) => <div className="nav-section" key={label}><div className="nav-label">{label}</div>{items.map(([name, href, Icon]) => <Link aria-label={name} className={`nav-item ${name === active || (name === "Scouting forms" && active === "Manual scouting") ? "active" : ""}`} href={href} key={name}><Icon size={17}/><span>{name}</span></Link>)}</div>)}</nav>
    <SignOutButton />
  </aside><main className="main">{children}</main></div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>{children}</div>;
}
