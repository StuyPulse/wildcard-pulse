import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app-shell";
import { GenerateAssignmentsForm } from "@/components/admin-forms";
import { createClient } from "@/lib/supabase/server";

export default async function MatchesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: eventKey } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const {data:event}=await supabase.from("events").select("id,name").eq("event_key",eventKey).maybeSingle();
  const [{ data: matches }, { data: eventTeams }, { data: membership }] = await Promise.all([
    event?supabase.from("matches").select("id,tba_match_key,match_number,match_type,red_teams,blue_teams,scheduled_at,status").eq("event_id", event.id).order("scheduled_at"):Promise.resolve({data:[]}),
    event?supabase.from("event_teams").select("team_id,teams(team_number)").eq("event_id", event.id):Promise.resolve({data:[]}),
    user ? supabase.from("organization_members").select("role").eq("user_id", user.id).in("role", ["admin", "developer"]).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const teamNumbers = new Map((eventTeams ?? []).map((row: any) => [row.team_id, row.teams?.team_number]));
  const displayAlliance = (teamIds: string[]) => teamIds.map((id) => teamNumbers.get(id) ?? "—").join(" · ");
  const displayMatch = (key: string, number: number, type: string) => key.startsWith("legacy:") ? (type === "qualification" ? "Q" : "P") + number : key.slice(key.lastIndexOf("_") + 1).toUpperCase().replace(/^QM/, "Q").replace(/M/g, " M");
  return <AppShell active="Matches"><PageHeader eyebrow={event?.name??"Event schedule"} title="Matches." />
    {membership&&event && <section className="card" style={{ marginBottom: 18 }}><div className="card-head"><div><h2>Activate scouting</h2><p className="muted" style={{ margin: "6px 0 0" }}>After importing, create assignments so scouts can open their forms.</p></div><Link className="button secondary" href={`/admin/assignments?eventId=${event.id}`}>Assignment board</Link></div><GenerateAssignmentsForm eventId={event.id} /></section>}
    <section className="card"><div className="card-head"><h2>Match schedule</h2><Link className="button secondary" href={`/events/${eventKey}/teams`}>Team directory</Link></div>{matches?.length ? matches.map((match) => <div className="match-row" key={match.id}><span className="match-time">{match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</span><span className="match-num">{displayMatch(match.tba_match_key, match.match_number, match.match_type)}</span><div className="alliances"><div className="red">{displayAlliance(match.red_teams)}</div><div className="blue">{displayAlliance(match.blue_teams)}</div></div><span className="tag pending">{match.status}</span></div>) : <p className="muted">The schedule will appear after the event is imported.</p>}</section>
  </AppShell>;
}
