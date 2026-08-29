import { getViewerContext, viewerCanManage } from "@/lib/viewer-context";
import { Sidebar } from "./sidebar";

export async function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const viewer = await getViewerContext();
  const activeEvent = viewer?.activeEvent;
  const canManage = viewerCanManage(viewer);
  const eventHref = activeEvent ? `/events/${activeEvent.event_key}` : "/events";
  const canPick = viewer?.role === "strategist" || viewer?.role === "master" || canManage;
  return <div className="shell"><Sidebar active={active} canManage={canManage} canPick={canPick} eventHref={eventHref}/><main className="main">{children}</main></div>;
}

export async function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  const activeEvent = (await getViewerContext())?.activeEvent;
  return <div className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="topbar-actions">{children}<div className="event-chip"><span className={activeEvent ? "online" : "offline"}/><span>Active event:</span><strong>{activeEvent?.name ?? "None selected"}</strong></div></div></div>;
}
