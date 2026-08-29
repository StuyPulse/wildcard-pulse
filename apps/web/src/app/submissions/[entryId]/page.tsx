import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

const labels: Record<string, string> = {
  auto: "Autonomous", auto_fuel: "Autonomous fuel", break_tag: "Breakage type", break_timestamp: "Breakage time", comments: "Comments", defended_teams: "Teams defended", defense: "Played defense", defense_level: "Defense level", ferry: "Ferried", fouls: "Fouls", manual_match: "Manual match", no_show: "No show", no_show_reason: "No-show reason", robot_broke: "Robot broke or was disabled", shoot: "Scored", shifts: "Teleop shifts", starting_spot: "Starting position", teleop_fuel: "Teleop fuel",
};

function fieldLabel(key: string) { return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function scalar(value: unknown) { if (typeof value === "boolean") return value ? "Yes" : "No"; if (value === null || value === undefined || value === "") return "Not recorded"; return String(value); }
function PayloadValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) return value.length ? <div className="submission-array">{value.map((item, index) => <div className="submission-array-item" key={index}>{typeof item === "object" && item !== null ? <PayloadGrid payload={item as Record<string, unknown>} compact/> : scalar(item)}</div>)}</div> : <span>Not recorded</span>;
  if (typeof value === "object" && value !== null) return <PayloadGrid payload={value as Record<string, unknown>} compact/>;
  return <span>{scalar(value)}</span>;
}
function PayloadGrid({ payload, compact = false }: { payload: Record<string, unknown>; compact?: boolean }) {
  const fields = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (!fields.length) return <p className="muted">No field values were saved for this entry.</p>;
  return <dl className={compact ? "submission-detail-grid submission-detail-grid-compact" : "submission-detail-grid"}>{fields.map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd><PayloadValue value={value}/></dd></div>)}</dl>;
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const supabase = await createClient();
  const { data: entry } = await (supabase as any).from("scouting_entries").select("id,entry_type,status,form_version,payload,submitted_at,created_at,updated_at,matches(match_number),teams(team_number,name),profiles(display_name)").eq("id", entryId).maybeSingle();
  if (!entry) notFound();
  const timestamp = entry.submitted_at ?? entry.created_at;
  const teamName = [entry.teams?.team_number, entry.teams?.name].filter(Boolean).join(" · ") || "Team report";
  return <AppShell active="Submissions"><PageHeader eyebrow="Scouting record" title={teamName}><Link className="link" href="/submissions">← All submissions</Link></PageHeader><section className="card submission-detail"><div className="card-head"><div><h2>{entry.entry_type.replace("_", " ")} report</h2><p className="muted">{entry.entry_type === "match" && entry.matches?.match_number ? `Qualification ${entry.matches.match_number} · ` : ""}{entry.profiles?.display_name ?? "Scout"} · {timestamp ? new Date(timestamp).toLocaleString() : "Saved draft"}</p></div><span className={`tag ${entry.status === "submitted" ? "complete" : "pending"}`}>{entry.status}</span></div><div className="submission-meta"><span>Form v{entry.form_version}</span><span>Last updated {new Date(entry.updated_at).toLocaleString()}</span></div><PayloadGrid payload={entry.payload ?? {}}/></section></AppShell>;
}
