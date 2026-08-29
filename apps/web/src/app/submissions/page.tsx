import { AppShell, PageHeader } from "@/components/app-shell";
import { LiveRefresh } from "@/components/live-refresh";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getViewerContext } from "@/lib/viewer-context";

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const scope = (await searchParams).scope === "mine" ? "mine" : "all";
  const [supabase, viewer] = await Promise.all([createClient(), getViewerContext()]);
  let query = (supabase as any).from("scouting_entries").select("id,entry_type,status,submitted_at,created_at,matches(match_number),teams(team_number,name),profiles(display_name)").order("created_at", { ascending: false }).limit(100);
  if (viewer?.activeEvent) query = query.eq("event_id", viewer.activeEvent.id);
  if (scope === "mine" && viewer) query = query.eq("scout_user_id", viewer.userId);
  const { data } = await query;

  return <AppShell active="Submissions"><LiveRefresh tables={["scouting_entries"]} eventId={viewer?.activeEvent?.id}/><PageHeader eyebrow="Scouting record" title="Submissions."/><section className="card"><div className="card-head"><div><h2>{scope === "mine" ? "Your scouting entries" : "All scouting entries"}</h2><span className="muted">{viewer?.activeEvent ? `${viewer.activeEvent.name} · ` : ""}Open any entry to review its full scouting report.</span></div><div className="filter-tabs"><Link className={scope === "all" ? "active" : ""} href="/submissions?scope=all">Everyone</Link><Link className={scope === "mine" ? "active" : ""} href="/submissions?scope=mine">Just me</Link></div></div>{data?.length ? data.map((entry: any) => <Link className="list-row submission-row" key={entry.id} href={`/submissions/${entry.id}`}><div><strong>{entry.entry_type === "match" ? `Q${entry.matches?.match_number ?? "—"} · ` : ""}{entry.teams?.team_number} {entry.teams?.name}</strong><div className="muted">{entry.entry_type.replace("_", " ")} · {entry.profiles?.display_name ?? "Scout"} · {(entry.submitted_at ?? entry.created_at) ? new Date(entry.submitted_at ?? entry.created_at).toLocaleString() : "Pending"}</div></div><div className="submission-row-action"><span className={`tag ${entry.status === "submitted" ? "complete" : "pending"}`}>{entry.status}</span><span aria-hidden="true">→</span></div></Link>) : <p className="muted">No scouting entries have been submitted yet.</p>}</section></AppShell>;
}
