import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, Gauge, LayoutDashboard, Radio, Settings, ShieldCheck, Users } from "lucide-react";

const navigation = [
  ["Workspace", [["Dashboard", "/dashboard", LayoutDashboard], ["Events", "/events", CalendarDays], ["Teams", "/events", Users], ["Matches", "/events", ClipboardList]]],
  ["Scout", [["My assignments", "/scout/assignments", Radio], ["Submissions", "/submissions", BarChart3]]],
  ["Admin", [["Event import", "/admin/sync", ClipboardList], ["Users & roles", "/admin/users", ShieldCheck], ["Form builder", "/admin/forms", Settings]]],
] as const;

export function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  return <div className="shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-mark">P</span><span className="brand-copy">pulse<small>STUYPULSE · 694</small></span></Link>
    {navigation.map(([label, items]) => <div key={label}><div className="nav-label">{label}</div>{items.map(([name, href, Icon]) => <Link className={`nav-item ${name === active ? "active" : ""}`} href={href} key={name}><Icon size={17}/><span>{name}</span></Link>)}</div>)}
  </aside><main className="main">{children}</main></div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>{children ?? <div className="event-chip"><span className="online"/>2026 Hudson Valley Regional</div>}</div>;
}
