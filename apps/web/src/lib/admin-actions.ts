"use server";
import { z } from "zod";
import { DEFAULT_2026_FORM, formDefinitionSchema, organizationRoleSchema } from "@wildcard/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string; success?: string };
async function adminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");
  const { data: member } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).in("role", ["admin", "developer"]).limit(1).maybeSingle();
  if (!member) throw new Error("Admin access required.");
  return { supabase, organizationId: member.organization_id };
}

export async function createEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  try { const input=z.object({name:z.string().trim().min(3).max(160),eventKey:z.string().trim().regex(/^[0-9]{4}[a-z0-9_]+$/),startsAt:z.string().optional(),endsAt:z.string().optional()}).safeParse({name:formData.get("name"),eventKey:formData.get("eventKey"),startsAt:formData.get("startsAt")||undefined,endsAt:formData.get("endsAt")||undefined}); if(!input.success)return{error:"Use a valid TBA event key, such as 2026nytr."}; const {supabase,organizationId}=await adminContext();const {error}=await supabase.from("events").insert({organization_id:organizationId,name:input.data.name,event_key:input.data.eventKey,starts_at:input.data.startsAt||null,ends_at:input.data.endsAt||null,status:"upcoming"});return error?{error:"Couldn’t create the event."}:{success:"Event created."}; } catch { return {error:"Admin access is required."}; }
}

export async function deleteEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = z.object({ eventId: z.string().uuid(), eventName: z.string().trim().min(1).max(160) }).safeParse({ eventId: formData.get("eventId"), eventName: formData.get("eventName") });
    if (!input.success) return { error: "This event could not be identified." };
    const { supabase, organizationId } = await adminContext();
    const { data: submissions, error: submissionsError } = await supabase.from("match_submissions").select("id").eq("event_id", input.data.eventId).limit(1);
    if (submissionsError) return { error: "Couldn’t check whether the event has submissions." };
    if (submissions?.length) return { error: "This event has scouting submissions, so it is protected from deletion." };
    const { data: deleted, error } = await supabase.from("events").delete().eq("id", input.data.eventId).eq("organization_id", organizationId).select("id").maybeSingle();
    if (error || !deleted) return { error: "Couldn’t delete the event. It may have changed or you may not have access." };
    revalidatePath("/events");
    revalidatePath("/admin/sync");
    return { success: `${input.data.eventName} was deleted.` };
  } catch { return { error: "Admin access is required." }; }
}

export async function generateObjectiveAssignments(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = z.object({ eventId: z.string().uuid() }).safeParse({ eventId: formData.get("eventId") });
    if (!input.success) return { error: "This event could not be identified." };
    const { organizationId } = await adminContext();
    const database = createAdminClient();
    const { data: event, error: eventError } = await database.from("events").select("id").eq("id", input.data.eventId).eq("organization_id", organizationId).maybeSingle();
    if (eventError || !event) return { error: "This event is unavailable or you no longer have admin access." };
    const [{ data: scouts, error: scoutsError }, { data: matches, error: matchesError }] = await Promise.all([
      database.from("organization_members").select("user_id").eq("organization_id", organizationId).eq("role", "scout"),
      database.from("matches").select("id,red_teams,blue_teams").eq("event_id", event.id).order("scheduled_at"),
    ]);
    if (scoutsError || matchesError) return { error: "Couldn’t read the schedule or scout roster." };
    if (!scouts?.length) return { error: "Add at least one user with the Scout role before creating assignments." };
    if (!matches?.length) return { error: "Import a match schedule before creating assignments." };
    const { data: existing, error: existingError } = await database.from("scouting_assignments").select("match_id,team_id,assignment_type").eq("assignment_type", "objective").in("match_id", matches.map((match) => match.id));
    if (existingError) return { error: "Couldn’t read existing scouting assignments." };
    const alreadyAssigned = new Set((existing ?? []).map((assignment) => `${assignment.match_id}:${assignment.team_id}:${assignment.assignment_type}`));
    const assignments: { match_id: string; scout_user_id: string; team_id: string; assignment_type: "objective" }[] = [];
    let scoutIndex = 0;
    for (const match of matches ?? []) {
      for (const teamId of [...new Set([...match.red_teams, ...match.blue_teams])]) {
        const key = `${match.id}:${teamId}:objective`;
        if (alreadyAssigned.has(key)) continue;
        assignments.push({ match_id: match.id, scout_user_id: scouts[scoutIndex % scouts.length].user_id, team_id: teamId, assignment_type: "objective" });
        scoutIndex += 1;
      }
    }
    if (!assignments.length) return { success: "Every team in this schedule already has an objective assignment." };
    const { error } = await database.from("scouting_assignments").upsert(assignments, { onConflict: "match_id,scout_user_id,team_id,assignment_type" });
    if (error) return importDatabaseError("scouting assignments", error);
    revalidatePath(`/events/${event.id}/matches`);
    revalidatePath("/scout/assignments");
    revalidatePath("/dashboard");
    return { success: `Created ${assignments.length} objective assignments across the imported schedule.` };
  } catch {
    return { error: "Admin access and the server secret are required to create assignments." };
  }
}

export async function publishDefaultForm(_: ActionState): Promise<ActionState> { try { const {supabase,organizationId}=await adminContext(); const {data:latest}=await supabase.from("form_definitions").select("version").eq("organization_id",organizationId).eq("name",DEFAULT_2026_FORM.title).order("version",{ascending:false}).limit(1).maybeSingle();const {error}=await supabase.from("form_definitions").insert({organization_id:organizationId,name:DEFAULT_2026_FORM.title,version:(latest?.version??0)+1,schema_json:DEFAULT_2026_FORM,is_active:true});return error?{error:"Couldn’t publish the form."}:{success:"New form version published."}; }catch{return{error:"Admin access is required."};} }

export async function publishFormDefinition(_: ActionState, formData: FormData): Promise<ActionState> { try { const raw=String(formData.get("schema")??"");let json:unknown;try{json=JSON.parse(raw)}catch{return{error:"The form schema must be valid JSON."};}const form=formDefinitionSchema.safeParse(json);if(!form.success)return{error:"The schema needs a title, game year, and valid field definitions."};const {supabase,organizationId}=await adminContext();const {data:latest}=await supabase.from("form_definitions").select("version").eq("organization_id",organizationId).eq("name",form.data.title).order("version",{ascending:false}).limit(1).maybeSingle();const {error}=await supabase.from("form_definitions").insert({organization_id:organizationId,name:form.data.title,version:(latest?.version??0)+1,schema_json:form.data,is_active:true});return error?{error:"Couldn’t publish the form."}:{success:`Published ${form.data.title} v${(latest?.version??0)+1}.`};}catch{return{error:"Admin access is required."};} }

export async function inviteMember(_: ActionState, formData: FormData): Promise<ActionState> { try {const input=z.object({email:z.string().email().toLowerCase().refine(email=>email.endsWith("@stuypulse.com")),role:organizationRoleSchema}).safeParse({email:formData.get("email"),role:formData.get("role")});if(!input.success)return{error:"Invitees must use a @stuypulse.com email and a valid role."};const {supabase,organizationId}=await adminContext();const admin=createAdminClient();const origin=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";const {data,error}=await admin.auth.admin.inviteUserByEmail(input.data.email,{redirectTo:`${origin}/auth/callback`});if(error||!data.user)return{error:"Couldn’t send the invitation."};const {error:membershipError}=await supabase.from("organization_members").upsert({organization_id:organizationId,user_id:data.user.id,role:input.data.role});return membershipError?{error:"Invitation sent, but the role assignment failed."}:{success:`Invitation sent to ${input.data.email}.`};}catch{return{error:"Admin access or server secret is required."};} }

const tbaEventSchema = z.object({ name: z.string().min(1), start_date: z.string().min(1), end_date: z.string().min(1) });
const tbaTeamSchema = z.object({ key: z.string().regex(/^frc\d+$/), team_number: z.number().int().positive(), nickname: z.string().nullable() });
const tbaMatchSchema = z.object({
  key: z.string().min(1), comp_level: z.string(), match_number: z.number().int().positive(), time: z.number().nullable().optional(), actual_time: z.number().nullable().optional(),
  alliances: z.object({ red: z.object({ team_keys: z.array(z.string().regex(/^frc\d+$/)) }), blue: z.object({ team_keys: z.array(z.string().regex(/^frc\d+$/)) }) }),
});

function tbaHeaders(key: string, etag?: string | null) {
  return { "X-TBA-Auth-Key": key, ...(etag ? { "If-None-Match": etag } : {}) };
}

function tbaResponseError(response: Response, resource: string): ActionState | null {
  if (response.ok || response.status === 304) return null;
  if (response.status === 401 || response.status === 403) return { error: "TBA rejected the read key. Replace TBA_AUTH_KEY in the server environment and restart the app." };
  if (response.status === 404) return { error: `TBA could not find this event while loading ${resource}. Copy the event key exactly from the TBA URL.` };
  if (response.status === 429) return { error: "TBA is rate-limiting requests. Wait a minute and try again." };
  return { error: `TBA returned HTTP ${response.status} while loading ${resource}. Try again shortly.` };
}

function importDatabaseError(stage: string, error: { message: string; code?: string } | null): ActionState {
  console.error(`TBA import database failure at ${stage}`, error);
  const detail = error?.code ? ` (${error.code})` : "";
  return { error: `The import could not save ${stage}${detail}. Check that the latest Supabase migrations have been applied, then try again.` };
}

export async function importTbaEvent(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = z.object({ eventKey: z.string().trim().toLowerCase().regex(/^[0-9]{4}[a-z0-9_]+$/) }).safeParse({ eventKey: formData.get("eventKey") });
    if (!parsed.success) return { error: "Enter a valid TBA event key, such as 2026nytr." };

    const tbaKey = process.env.TBA_AUTH_KEY;
    if (!tbaKey) return { error: "TBA_AUTH_KEY is not configured on the server." };
    const { organizationId } = await adminContext();
    const database = createAdminClient();
    const { data: existing, error: existingError } = await database
      .from("events")
      .select("id,tba_etag,tba_teams_etag,tba_matches_etag")
      .eq("organization_id", organizationId)
      .eq("event_key", parsed.data.eventKey)
      .maybeSingle();
    if (existingError) return importDatabaseError("the existing event", existingError);

    const baseUrl = `https://www.thebluealliance.com/api/v3/event/${parsed.data.eventKey}`;
    const [eventResponse, teamsResponse, matchesResponse] = await Promise.all([
      fetch(baseUrl, { headers: tbaHeaders(tbaKey, existing?.tba_etag), cache: "no-store" }),
      fetch(`${baseUrl}/teams/simple`, { headers: tbaHeaders(tbaKey, existing?.tba_teams_etag), cache: "no-store" }),
      fetch(`${baseUrl}/matches/simple`, { headers: tbaHeaders(tbaKey, existing?.tba_matches_etag), cache: "no-store" }),
    ]);
    for (const [response, resource] of [[eventResponse, "the event"], [teamsResponse, "teams"], [matchesResponse, "the match schedule"]] as const) {
      const failure = tbaResponseError(response, resource);
      if (failure) return failure;
    }
    if (!existing && (eventResponse.status === 304 || teamsResponse.status === 304 || matchesResponse.status === 304)) {
      return { error: "TBA returned cached data before the event was created locally. Retry the import once." };
    }

    let eventId = existing?.id;
    if (eventResponse.status !== 304) {
      const event = tbaEventSchema.safeParse(await eventResponse.json());
      if (!event.success) return { error: "TBA returned an event with an unexpected format. Try again shortly." };
      const { data: savedEvent, error } = await database.from("events").upsert({
        organization_id: organizationId,
        event_key: parsed.data.eventKey,
        name: event.data.name,
        starts_at: `${event.data.start_date}T00:00:00Z`,
        ends_at: `${event.data.end_date}T23:59:59Z`,
        status: "upcoming",
      }, { onConflict: "organization_id,event_key" }).select("id").single();
      if (error || !savedEvent) return importDatabaseError("the event", error);
      eventId = savedEvent.id;
    }
    if (!eventId) return { error: "The existing event could not be identified. Retry the import once." };

    let importedTeams: z.infer<typeof tbaTeamSchema>[] | null = null;
    let teamCount = 0;
    if (teamsResponse.status !== 304) {
      const parsedTeams = z.array(tbaTeamSchema).safeParse(await teamsResponse.json());
      if (!parsedTeams.success) return { error: "TBA returned teams with an unexpected format. Try again shortly." };
      importedTeams = parsedTeams.data;
      teamCount = importedTeams.length;
      if (importedTeams.length) {
        const { error } = await database.from("teams").upsert(importedTeams.map((team) => ({
          organization_id: organizationId, team_number: team.team_number, name: team.nickname || `FRC Team ${team.team_number}`,
        })), { onConflict: "organization_id,team_number" });
        if (error) return importDatabaseError("teams", error);
      }
    }

    const { data: databaseTeams, error: databaseTeamsError } = await database.from("teams").select("id,team_number").eq("organization_id", organizationId);
    if (databaseTeamsError) return importDatabaseError("the team directory", databaseTeamsError);
    const teamIdByNumber = new Map((databaseTeams ?? []).map((team) => [team.team_number, team.id]));
    const teamNumberFromKey = (teamKey: string) => Number(teamKey.slice(3));

    if (importedTeams?.length) {
      const teamLinks = importedTeams.map((team) => ({ event_id: eventId, team_id: teamIdByNumber.get(team.team_number) })).filter((link): link is { event_id: string; team_id: string } => Boolean(link.team_id));
      if (teamLinks.length !== importedTeams.length) return { error: "TBA returned a participant that was not saved. Retry the import once." };
      const { error } = await database.from("event_teams").upsert(teamLinks, { onConflict: "event_id,team_id" });
      if (error) return importDatabaseError("event team links", error);
    }

    let matchCount = 0;
    if (matchesResponse.status !== 304) {
      const parsedMatches = z.array(tbaMatchSchema).safeParse(await matchesResponse.json());
      if (!parsedMatches.success) return { error: "TBA returned a schedule with an unexpected format. Try again shortly." };
      matchCount = parsedMatches.data.length;
      const missingTeam = parsedMatches.data.flatMap((match) => [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys]).map(teamNumberFromKey).find((number) => !teamIdByNumber.has(number));
      if (missingTeam) return { error: `TBA's schedule references team ${missingTeam}, but that team was not saved. Retry the import once.` };
      if (parsedMatches.data.length) {
        const { error } = await database.from("matches").upsert(parsedMatches.data.map((match) => ({
          event_id: eventId,
          tba_match_key: match.key,
          match_number: match.match_number,
          match_type: match.comp_level === "qm" ? "qualification" : match.comp_level === "pr" ? "practice" : "playoff",
          red_teams: match.alliances.red.team_keys.map(teamNumberFromKey).map((number) => teamIdByNumber.get(number)!),
          blue_teams: match.alliances.blue.team_keys.map(teamNumberFromKey).map((number) => teamIdByNumber.get(number)!),
          scheduled_at: match.time ? new Date(match.time * 1000).toISOString() : null,
          status: match.actual_time ? "played" : "scheduled",
        })), { onConflict: "event_id,tba_match_key" });
        if (error) return importDatabaseError("the match schedule", error);
      }
    }

    const { error: metadataError } = await database.from("events").update({
      tba_etag: eventResponse.status === 304 ? existing?.tba_etag ?? null : eventResponse.headers.get("etag") ?? existing?.tba_etag ?? null,
      tba_teams_etag: teamsResponse.status === 304 ? existing?.tba_teams_etag ?? null : teamsResponse.headers.get("etag") ?? existing?.tba_teams_etag ?? null,
      tba_matches_etag: matchesResponse.status === 304 ? existing?.tba_matches_etag ?? null : matchesResponse.headers.get("etag") ?? existing?.tba_matches_etag ?? null,
      tba_last_synced_at: new Date().toISOString(),
    }).eq("id", eventId);
    if (metadataError) return importDatabaseError("sync metadata", metadataError);

    revalidatePath("/events");
    revalidatePath("/admin/sync");
    revalidatePath(`/events/${eventId}/matches`);
    return { success: `Synced ${teamCount} teams and ${matchCount} matches from TBA. Unchanged data was kept from the previous sync.` };
  } catch (error) {
    console.error("TBA import failed", error);
    return { error: "The import failed before it could finish. Check the server logs for the exact failure, then try again." };
  }
}
