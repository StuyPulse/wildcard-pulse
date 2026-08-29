"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, ListOrdered, MoreHorizontal, Radio, Settings, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { SignOutButton } from "./sign-out-button";

type Props = { active: string; canManage: boolean; eventHref: string };
type NavItem = [string, string, LucideIcon];
type NavSection = [string, NavItem[]];

function NavLink({ item, active, compact = false, onNavigate }: { item: NavItem; active: string; compact?: boolean; onNavigate?: () => void }) {
  const [name, href, Icon] = item;
  return <Link title={compact ? name : undefined} aria-label={name} className={`nav-item ${name === active || (name === "Scouting forms" && active === "Manual scouting") ? "active" : ""}`} href={href} onClick={onNavigate}><Icon size={17}/><span>{name}</span></Link>;
}

export function Sidebar({ active, canManage, eventHref }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const workspace: NavItem[] = [["Dashboard", "/dashboard", LayoutDashboard], ["Teams", `${eventHref}/teams`, Users], ["Summary", `${eventHref}/summary`, BarChart3], ["Matches", `${eventHref}/matches`, ClipboardList]];
  const scout: NavItem[] = [["Scouting forms", "/scout/manual", ClipboardList], ["Submissions", "/submissions", BarChart3]];
  const strategy: NavItem[] = [["Picklist", `${eventHref}/picklist`, ListOrdered]];
  const admin: NavItem[] = [["Events", "/events", CalendarDays], ["Assignments", "/admin/assignments", Radio], ["Users & roles", "/admin/users", ShieldCheck], ["Form builder", "/admin/forms", Settings]];
  const navigation: NavSection[] = [["Workspace", workspace], ["Scout", scout], ["Strategy", strategy]];
  if (canManage) navigation.push(["Admin", admin]);
  const mobilePrimary = [...workspace, scout[0]];
  const mobileMore = [...scout.slice(1), ...strategy, ...(canManage ? admin : [])];
  return <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
    <div className="sidebar-top"><Link href="/dashboard" className="brand"><BrandLogo/><span className="brand-copy">wildcard<small>STUYPULSE · 694</small></span></Link><button className="sidebar-toggle" type="button" onClick={() => setCollapsed((current) => !current)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button></div>
    <nav className="nav-links desktop-nav" aria-label="Primary navigation">{navigation.map(([label, items]) => <div className="nav-section" key={label}><div className="nav-label">{label}</div>{items.map((item) => <NavLink item={item} active={active} compact={collapsed} key={item[0]}/>)}</div>)}</nav>
    <div className="desktop-signout"><SignOutButton /></div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{mobilePrimary.map((item) => <NavLink item={item} active={active} onNavigate={() => setMoreOpen(false)} key={item[0]}/>) }<button className={`nav-item mobile-more-trigger ${mobileMore.some(([name]) => name === active) ? "active" : ""}`} type="button" aria-expanded={moreOpen} aria-label={moreOpen ? "Close more navigation" : "Open more navigation"} onClick={() => setMoreOpen((current) => !current)}>{moreOpen ? <X size={18}/> : <MoreHorizontal size={18}/>}<span>More</span></button></nav>
    {moreOpen && <div className="mobile-more" role="dialog" aria-label="More navigation"><div className="mobile-more-head"><span>More</span><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more navigation"><X size={18}/></button></div>{mobileMore.map((item) => <NavLink item={item} active={active} onNavigate={() => setMoreOpen(false)} key={item[0]}/>)}<SignOutButton /></div>}
  </aside>;
}
