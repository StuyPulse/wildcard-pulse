import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { ScoutForm } from "./scout-form";
import { formDefinitionSchema } from "@wildcard/shared";

export default async function ScoutMatchPage({ params, searchParams }: { params: Promise<{ matchId: string }>; searchParams: Promise<{ assignment?: string }> }) {
  const { matchId } = await params;
  const { assignment } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: match } = await supabase.from("matches").select("id,event_id,match_number").eq("id", matchId).maybeSingle();
  if (!match) notFound();
  const { data: assignmentRow } = user && assignment ? await supabase.from("scouting_assignments").select("id,team_id,teams(team_number,name)").eq("id", assignment).eq("match_id", matchId).eq("scout_user_id", user.id).maybeSingle() : { data: null };
  if (!assignmentRow) return <AppShell active="My assignments"><PageHeader eyebrow="Scout workspace" title="Assignment unavailable." /><div className="card"><p className="muted">This form must be opened by the scout assigned to this match.</p></div></AppShell>;
  const [{ data: definition }, { data: submission }] = await Promise.all([
    supabase.from("form_definitions").select("version,schema_json").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("match_submissions").select("id,payload,revision,status").eq("assignment_id", assignmentRow.id).maybeSingle(),
  ]);
  const form = formDefinitionSchema.safeParse(definition?.schema_json);
  const team = assignmentRow.teams as unknown as { team_number: number; name: string } | null;
  const existingSubmission = submission && submission.payload && typeof submission.payload === "object" && !Array.isArray(submission.payload) ? { id: submission.id, payload: submission.payload as Record<string, unknown>, revision: submission.revision, status: submission.status } : undefined;
  return <AppShell active="My assignments"><PageHeader eyebrow={`Qualification ${match.match_number}`} title={`${team?.team_number} · ${team?.name}`} /><ScoutForm eventId={match.event_id} matchId={match.id} teamId={assignmentRow.team_id} assignmentId={assignmentRow.id} formVersion={definition?.version ?? 1} form={form.success ? form.data : undefined} submission={existingSubmission} /></AppShell>;
}
