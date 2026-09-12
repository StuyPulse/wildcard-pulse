import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const matchSchema = z.object({
  key: z.string().min(1),
  comp_level: z.string(),
  match_number: z.number().int().positive(),
  time: z.number().nullable().optional(),
  predicted_time: z.number().nullable().optional(),
  actual_time: z.number().nullable().optional(),
  post_result_time: z.number().nullable().optional(),
  alliances: z.object({
    red: z.object({ team_keys: z.array(z.string().regex(/^frc\d+$/)), score: z.number().int() }),
    blue: z.object({ team_keys: z.array(z.string().regex(/^frc\d+$/)), score: z.number().int() }),
  }),
  score_breakdown: z.object({ red: z.record(z.string(), z.unknown()).nullable(), blue: z.record(z.string(), z.unknown()).nullable() }).nullable().optional(),
});

export type LiveSyncResult = { updated: boolean; skipped?: boolean; message: string };
export type ActiveEventSyncResult = LiveSyncResult & { eventKey: string };
const intervalMs = 25_000;
const typeFor = (level: string) => level === "qm" ? "qualification" : level === "pr" ? "practice" : "playoff";
const scoreFor = (score: number) => score >= 0 ? score : null;
const tbaSimpleTeamSchema = z.object({ team_number: z.number().int().positive(), nickname: z.string().nullable().optional() });

async function ensureLiveEventRoster(database: any, event: { id: string; event_key: string }, organizationId: string, key: string, teamNumbers: number[]) {
  const { data: storedTeams, error: storedTeamsError } = await database.from("teams").select("id,team_number").eq("organization_id", organizationId);
  if (storedTeamsError) throw new Error("Could not load the event team directory.");
  let teamIdByNumber = new Map((storedTeams ?? []).map((team: { id: string; team_number: number }) => [team.team_number, team.id]));
  const missingNumbers = teamNumbers.filter((number) => !teamIdByNumber.has(number));

  if (missingNumbers.length) {
    let namesByNumber = new Map<number, string>();
    try {
      const response = await fetch(`https://www.thebluealliance.com/api/v3/event/${event.event_key}/teams/simple`, { headers: { "X-TBA-Auth-Key": key }, cache: "no-store" });
      const parsed = response.ok ? z.array(tbaSimpleTeamSchema).safeParse(await response.json()) : null;
      if (parsed?.success) namesByNumber = new Map(parsed.data.map((team) => [team.team_number, team.nickname || `FRC Team ${team.team_number}`]));
    } catch {
      // Match data remains useful even if the optional display-name lookup is unavailable.
    }
    const { error: saveTeamsError } = await database.from("teams").upsert(missingNumbers.map((team_number) => ({ organization_id: organizationId, team_number, name: namesByNumber.get(team_number) ?? `FRC Team ${team_number}` })), { onConflict: "organization_id,team_number" });
    if (saveTeamsError) throw new Error("Could not save the live event team directory.");
    const { data: refreshedTeams, error: refreshedTeamsError } = await database.from("teams").select("id,team_number").eq("organization_id", organizationId);
    if (refreshedTeamsError) throw new Error("Could not reload the live event team directory.");
    teamIdByNumber = new Map((refreshedTeams ?? []).map((team: { id: string; team_number: number }) => [team.team_number, team.id]));
  }

  const unresolvedTeam = teamNumbers.find((number) => !teamIdByNumber.has(number));
  if (unresolvedTeam) throw new Error(`Could not prepare team ${unresolvedTeam} for the live event.`);
  const { error: linkError } = await database.from("event_teams").upsert(teamNumbers.map((team_number) => ({ event_id: event.id, team_id: teamIdByNumber.get(team_number)! })), { onConflict: "event_id,team_id" });
  if (linkError) throw new Error("Could not link the official team roster to the live event.");
  return { teamIdByNumber, addedTeamCount: missingNumbers.length };
}

export async function syncLiveEvent(eventId: string, organizationId: string): Promise<LiveSyncResult> {
  const database: any = createAdminClient();
  const { data: event, error: eventError } = await database.from("events").select("id,event_key,is_manual,tba_live_matches_etag").eq("id", eventId).eq("organization_id", organizationId).eq("status", "active").maybeSingle();
  if (eventError || !event) return { updated: false, skipped: true, message: "No active event is available." };
  if (event.is_manual) return { updated: false, skipped: true, message: "Manual events do not sync with TBA." };

  const now = new Date();
  const staleBefore = new Date(now.getTime() - intervalMs).toISOString();
  const { data: claim, error: claimError } = await database.from("events").update({ tba_live_sync_started_at: now.toISOString() }).eq("id", event.id).or(`tba_live_sync_started_at.is.null,tba_live_sync_started_at.lt.${staleBefore}`).select("id").maybeSingle();
  if (claimError) throw new Error("Could not reserve the live TBA sync.");
  if (!claim) return { updated: false, skipped: true, message: "Live data is already fresh." };

  const key = process.env.TBA_AUTH_KEY;
  if (!key) throw new Error("TBA_AUTH_KEY is not configured.");
  const response = await fetch(`https://www.thebluealliance.com/api/v3/event/${event.event_key}/matches`, {
    headers: { "X-TBA-Auth-Key": key, ...(event.tba_live_matches_etag ? { "If-None-Match": event.tba_live_matches_etag } : {}) },
    cache: "no-store",
  });
  if (response.status === 304) {
    await database.from("events").update({ tba_last_live_synced_at: now.toISOString() }).eq("id", event.id);
    return { updated: false, message: "Official match data is unchanged." };
  }
  if (!response.ok) throw new Error(`TBA live match sync returned HTTP ${response.status}.`);
  const parsed = z.array(matchSchema).safeParse(await response.json());
  if (!parsed.success) throw new Error("TBA returned an unexpected live match payload.");

  const numberFromKey = (teamKey: string) => Number(teamKey.slice(3));
  const teamNumbers = [...new Set(parsed.data.flatMap((match) => [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys]).map(numberFromKey))];
  const { teamIdByNumber, addedTeamCount } = await ensureLiveEventRoster(database, event, organizationId, key, teamNumbers);

  const rows = parsed.data.map((match) => ({
    event_id: event.id,
    tba_match_key: match.key,
    match_number: match.match_number,
    match_type: typeFor(match.comp_level),
    red_teams: match.alliances.red.team_keys.map(numberFromKey).map((number) => teamIdByNumber.get(number)!),
    blue_teams: match.alliances.blue.team_keys.map(numberFromKey).map((number) => teamIdByNumber.get(number)!),
    scheduled_at: (match.time ?? match.predicted_time) ? new Date((match.time ?? match.predicted_time)! * 1000).toISOString() : null,
    actual_at: match.actual_time ? new Date(match.actual_time * 1000).toISOString() : null,
    status: match.actual_time || match.post_result_time ? "played" : "scheduled",
    red_score: scoreFor(match.alliances.red.score),
    blue_score: scoreFor(match.alliances.blue.score),
    tba_score_breakdown: match.score_breakdown ?? {},
  }));
  if (rows.length) {
    const { error } = await database.from("matches").upsert(rows, { onConflict: "event_id,tba_match_key" });
    if (error) throw new Error("Could not save live match results.");
  }
  await database.from("events").update({ tba_live_matches_etag: response.headers.get("etag"), tba_last_live_synced_at: now.toISOString() }).eq("id", event.id);
  return { updated: true, message: `Updated ${rows.length} official matches${addedTeamCount ? ` and added ${addedTeamCount} teams` : ""}.` };
}

/** Sync each organization’s active event for the protected production scheduler. */
export async function syncAllActiveEvents(): Promise<ActiveEventSyncResult[]> {
  const database: any = createAdminClient();
  const { data: events, error } = await database.from("events").select("id,organization_id,event_key").eq("status", "active").eq("is_manual", false);
  if (error) throw new Error("Could not load active events for live synchronization.");

  return Promise.all((events ?? []).map(async (event: { id: string; organization_id: string; event_key: string }) => ({
    eventKey: event.event_key,
    ...(await syncLiveEvent(event.id, event.organization_id)),
  })));
}
