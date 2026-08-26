import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { RebuiltMatchForm } from "./rebuilt-match-form";

export default async function ScoutMatchPage({ params, searchParams }: { params: Promise<{ matchId: string }>; searchParams: Promise<{ assignment?: string }> }) {
  const { matchId } = await params;
  const { assignment } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: match } = await supabase.from("matches").select("id,event_id,match_number,red_teams,blue_teams").eq("id", matchId).maybeSingle();
  if (!match) notFound();
  const { data: assignmentRow } = user && assignment ? await supabase.from("scouting_assignments").select("id,team_id,teams(team_number,name)").eq("id", assignment).eq("match_id", matchId).eq("scout_user_id", user.id).maybeSingle() : { data: null };
  if (!assignmentRow) return <AppShell active="My assignments"><PageHeader eyebrow="Scout workspace" title="Assignment unavailable." /><div className="card"><p className="muted">This form must be opened by the scout assigned to this match.</p></div></AppShell>;
  const team = assignmentRow.teams as unknown as { team_number: number; name: string } | null;
  const { data: eventTeams } = await supabase.from("event_teams").select("team_id,teams(team_number)").eq("event_id", match.event_id);
  const teamNumbers = new Map((eventTeams ?? []).map((row:any)=>[row.team_id,row.teams?.team_number]));
  const red = match.red_teams.includes(assignmentRow.team_id); const others=[...match.red_teams,...match.blue_teams].filter(id=>id!==assignmentRow.team_id).map(id=>({id,number:teamNumbers.get(id)??0,alliance:match.red_teams.includes(id)?"red" as const:"blue" as const}));
  return <AppShell active="My assignments"><PageHeader eyebrow={`Qualification ${match.match_number}`} title={`${team?.team_number} · ${team?.name}`} /><RebuiltMatchForm eventId={match.event_id} matchId={match.id} teamId={assignmentRow.team_id} assignmentId={assignmentRow.id} teamNumber={team?.team_number ?? 0} alliance={red?"red":"blue"} otherTeams={others}/></AppShell>;
}
