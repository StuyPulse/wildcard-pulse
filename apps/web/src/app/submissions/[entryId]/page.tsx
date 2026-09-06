import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalDateTime } from "@/components/local-date-time";

const labels: Record<string, string> = {
  auto: "Autonomous", auto_fuel: "Autonomous fuel", break_tag: "Breakage type", break_timestamp: "Breakage time", comments: "Comments", defended_teams: "Teams defended", defense: "Played defense", defense_level: "Defense level", ferry: "Ferried", fouls: "Fouls", manual_match: "Manual match", no_show: "No show", no_show_reason: "No-show reason", robot_broke: "Robot broke or was disabled", shoot: "Scored", starting_spot: "Starting position", starting_spot_confirmed: "Starting position confirmed", teleop: "Teleop", teleop_fuel: "Teleop fuel",
};

function fieldLabel(key: string) { return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function scalar(value: unknown) { if (typeof value === "boolean") return value ? "Yes" : "No"; if (value === null || value === undefined || value === "") return "Not recorded"; return String(value); }
function PayloadValue({ value, fieldKey, teamNames }: { value: unknown; fieldKey?: string; teamNames: Map<string, string> }) {
  if (Array.isArray(value)) return value.length ? <div className="submission-array">{value.map((item, index) => <div className="submission-array-item" key={index}>{fieldKey === "defended_teams" ? teamNames.get(String(item)) ?? "Unknown team" : typeof item === "object" && item !== null ? <PayloadGrid payload={item as Record<string, unknown>} compact teamNames={teamNames}/> : scalar(item)}</div>)}</div> : <span>Not recorded</span>;
  if (typeof value === "object" && value !== null) return <PayloadGrid payload={value as Record<string, unknown>} compact teamNames={teamNames}/>;
  return <span>{scalar(value)}</span>;
}
function AutoPathPreview({ svg }: { svg: string }) {
  if (!svg.includes("<svg") || !svg.includes("<path")) return <span>Not recorded</span>;
  return <div className="auto-path-preview"><img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Autonomous route drawn over the 2026 field"/></div>;
}
function PayloadGrid({ payload, compact = false, teamNames }: { payload: Record<string, unknown>; compact?: boolean; teamNames: Map<string, string> }) {
  const fields = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!fields.length) return <p className="muted">No field values were saved for this entry.</p>;
  return <dl className={compact ? "submission-detail-grid submission-detail-grid-compact" : "submission-detail-grid"}>{fields.map(([key, value]) => <div className={key === "auto_routines_drawing" ? "submission-drawing" : undefined} key={key}><dt>{fieldLabel(key)}</dt><dd>{key === "auto_routines_drawing" && typeof value === "string" ? <AutoPathPreview svg={value}/> : <PayloadValue value={value} fieldKey={key} teamNames={teamNames}/>}</dd></div>)}</dl>;
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const supabase = await createClient();
  const { data: entry } = await (supabase as any).from("scouting_entries").select("id,event_id,entry_type,status,form_version,payload,submitted_at,created_at,updated_at,matches(match_number),teams(team_number,name),profiles(display_name)").eq("id", entryId).maybeSingle();
  if (!entry) notFound();
  const { data: eventTeams } = await supabase.from("event_teams").select("team_id,teams(team_number,name)").eq("event_id", entry.event_id);
  const teamNames = new Map((eventTeams ?? []).map((row: any) => [row.team_id, `${row.teams?.team_number ?? "Unknown"} · ${row.teams?.name ?? "team"}`]));
  const timestamp = entry.submitted_at ?? entry.created_at;
  const teamName = [entry.teams?.team_number, entry.teams?.name].filter(Boolean).join(" · ") || "Team report";
  return <AppShell active="Submissions"><PageHeader eyebrow="Scouting record" title={teamName}><Link className="link" href="/submissions">All submissions</Link></PageHeader><section className="card submission-detail"><div className="card-head"><div><h2>{entry.entry_type.replace("_", " ")} report</h2><p className="muted">{entry.entry_type === "match" && entry.matches?.match_number ? `Qualification ${entry.matches.match_number} · ` : ""}{entry.profiles?.display_name ?? "Scout"} · {timestamp ? <LocalDateTime value={timestamp}/> : "Saved draft"}</p></div><span className={`tag ${entry.status === "submitted" ? "complete" : "pending"}`}>{entry.status}</span></div><div className="submission-meta"><span>Form v{entry.form_version}</span><span>Last updated <LocalDateTime value={entry.updated_at}/></span></div><PayloadGrid payload={entry.payload ?? {}} teamNames={teamNames}/></section></AppShell>;
}
