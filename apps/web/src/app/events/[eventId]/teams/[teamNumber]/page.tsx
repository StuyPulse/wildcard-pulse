import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function TeamDetail({ params }: { params: Promise<{ eventId: string; teamNumber: string }> }) {
  const { eventId, teamNumber } = await params; const number = Number(teamNumber);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const supabase = await createClient();
  const { data: eventTeam } = await supabase.from("event_teams").select("teams(id,team_number,name)").eq("event_id", eventId).eq("teams.team_number", number).maybeSingle();
  const team = eventTeam?.teams as unknown as { id: string; team_number: number; name: string } | null;
  if (!team) notFound();
  const { data: submissions } = await supabase.from("match_submissions").select("id,status,submitted_at,matches(match_number)").eq("team_id", team.id).order("submitted_at", { ascending: false }).limit(20);
  return <AppShell active="Teams"><PageHeader eyebrow="Team detail" title={`${team.team_number} · ${team.name}`}/><section className="card"><div className="card-head"><h2>Match history</h2><span className="muted">{submissions?.length ?? 0} visible entries</span></div>{submissions?.length ? submissions.map((submission: any) => <div className="list-row" key={submission.id}><div><strong>Qualification {submission.matches?.match_number}</strong><div className="muted">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "Draft"}</div></div><span className={`tag ${submission.status === "submitted" ? "complete" : "pending"}`}>{submission.status}</span></div>) : <p className="muted">No submissions are visible for this team yet.</p>}</section></AppShell>;
}
