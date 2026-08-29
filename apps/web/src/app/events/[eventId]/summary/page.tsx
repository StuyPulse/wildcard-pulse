import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { LiveRefresh } from "@/components/live-refresh";
import { calculateScoutStats } from "@/lib/scouting-stats";
import { SummaryTable } from "./summary-table";

type PageProps = { params: Promise<{ eventId: string }>; searchParams: Promise<{ sort?: string; dir?: string }> };
const asNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
function tbaMetric(ranking: any, info: any[], pattern: RegExp) { const index = info.findIndex((metric) => pattern.test(metric.name)); return index >= 0 ? asNumber(ranking?.sort_orders?.[index]) : 0; }

export default async function SummaryPage({ params, searchParams }: PageProps) {
  const { eventId: eventKey } = await params; const query = await searchParams; const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id,name,event_key").eq("event_key", eventKey).maybeSingle();
  if (!event) return <AppShell active="Summary"><PageHeader eyebrow="Event summary" title="Event unavailable."/><section className="card"><p className="muted">This event could not be found.</p></section></AppShell>;
  const [{ data: eventTeams }, { data: entries }] = await Promise.all([supabase.from("event_teams").select("team_id,teams(team_number,name)").eq("event_id", event.id), (supabase as any).from("scouting_entries").select("team_id,payload").eq("event_id", event.id).eq("entry_type", "match").eq("status", "submitted")]);
  let rankings: any[] = []; let sortInfo: any[] = []; let oprs: Record<string, number> = {}; let apiError = "";
  if (!process.env.TBA_AUTH_KEY) apiError = "TBA_AUTH_KEY is unavailable to this deployment."; else try { const headers = { "X-TBA-Auth-Key": process.env.TBA_AUTH_KEY }; const [rankingsResponse, oprsResponse] = await Promise.all([fetch(`https://www.thebluealliance.com/api/v3/event/${event.event_key}/rankings`, { headers, next: { revalidate: 20 } }), fetch(`https://www.thebluealliance.com/api/v3/event/${event.event_key}/oprs`, { headers, next: { revalidate: 20 } })]); const rankingPayload = await rankingsResponse.json(); const oprPayload = await oprsResponse.json(); if (rankingsResponse.ok && Array.isArray(rankingPayload?.rankings)) { rankings = rankingPayload.rankings; sortInfo = rankingPayload.sort_order_info ?? []; oprs = oprPayload?.oprs ?? {}; } else apiError = `TBA returned HTTP ${rankingsResponse.status}.`; } catch { apiError = "Could not reach TBA right now."; }
  const tbaByTeam = new Map(rankings.map((ranking) => [Number(String(ranking.team_key ?? "").replace("frc", "")), ranking]));
  const rows = (eventTeams ?? []).map((link: any) => { const reports = (entries ?? []).filter((entry: any) => entry.team_id === link.team_id); const tba = tbaByTeam.get(link.teams?.team_number); return { team: link.teams, teamId: link.team_id, tba, opr: asNumber(oprs[`frc${link.teams?.team_number}`]), stats: calculateScoutStats(reports), tbaTotalFuel: tbaMetric(tba, sortInfo, /total.*fuel|avg.*match/i), tbaAutoFuel: tbaMetric(tba, sortInfo, /auto.*fuel/i), tbaTeleopFuel: tbaMetric(tba, sortInfo, /teleop.*fuel/i) }; });
  const metric = (row: any, key: string) => key === "team" ? row.team?.team_number : key === "rank" ? asNumber(row.tba?.rank || 99999) : key in row.stats ? asNumber(row.stats[key]) : asNumber(row[key]); const sort = query.sort ?? "rank"; const dir = query.dir ?? "desc"; rows.sort((a: any, b: any) => { const diff = metric(a, sort) - metric(b, sort); return sort === "team" || sort === "rank" ? diff : diff * (dir === "asc" ? 1 : -1); });
  return <AppShell active="Summary"><LiveRefresh tables={["scouting_entries"]} eventId={event.id}/><PageHeader eyebrow={event.name} title="Scouting summary."/><section className="card summary-card"><div className="card-head"><div><h2>Live team data</h2><p className="muted">Switch the view to focus on the decision you are making. Headings sort within that view.</p></div><div className="row-actions"><Link className="button secondary" href={`/events/${eventKey}/compare`}>Compare teams</Link><Link className="button secondary" href={`/events/${eventKey}/teams`}>Team directory</Link></div></div>{apiError && <p className="error">{apiError}</p>}<SummaryTable eventKey={eventKey} rows={rows as any} sort={sort} dir={dir}/></section></AppShell>;
}
