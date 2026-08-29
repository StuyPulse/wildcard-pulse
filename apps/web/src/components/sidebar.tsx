"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, ListOrdered, Radio, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { SignOutButton } from "./sign-out-button";

type Props = { active: string; canManage: boolean; canPick: boolean; eventHref: string };
type NavItem = [string, string, LucideIcon];
type NavSection = [string, NavItem[]];

export function Sidebar({ active, canManage, canPick, eventHref }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(window.localStorage.getItem("wildcard:sidebar-collapsed") === "true"), []);
  function toggle() { setCollapsed((next) => { window.localStorage.setItem("wildcard:sidebar-collapsed", String(!next)); return !next; }); }
  const workspace: NavItem[] = [["Dashboard", "/dashboard", LayoutDashboard], ["Teams", `${eventHref}/teams`, Users], ["Summary", `${eventHref}/summary`, BarChart3], ["Matches", `${eventHref}/matches`, ClipboardList]];
  const scout: NavItem[] = [["Scouting forms", "/scout/manual", ClipboardList], ["Submissions", "/submissions", BarChart3]];
  const navigation: NavSection[] = [["Workspace", workspace], ["Scout", scout]];
  if (canPick) navigation.push(["Strategy", [["Picklist", `${eventHref}/picklist`, ListOrdered]]]);
  if (canManage) navigation.push(["Admin", [["Events", "/events", CalendarDays], ["Assignments", "/admin/assignments", Radio], ["Users & roles", "/admin/users", ShieldCheck], ["Form builder", "/admin/forms", Settings]]]);
  return <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
    <div className="sidebar-top"><Link href="/dashboard" className="brand"><BrandLogo/><span className="brand-copy">wildcard<small>STUYPULSE · 694</small></span></Link><button className="sidebar-toggle" type="button" onClick={toggle} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button></div>
    <nav className="nav-links" aria-label="Primary navigation">{navigation.map(([label, items]) => <div className="nav-section" key={label}><div className="nav-label">{label}</div>{items.map(([name, href, Icon]) => <Link title={collapsed ? name : undefined} aria-label={name} className={`nav-item ${name === active || (name === "Scouting forms" && active === "Manual scouting") ? "active" : ""}`} href={href} key={name}><Icon size={17}/><span>{name}</span></Link>)}</div>)}</nav>
    <SignOutButton />
  </aside>;
}
