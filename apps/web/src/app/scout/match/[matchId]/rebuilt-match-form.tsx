"use client";

import { useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId: string;
  matchId?: string;
  teamId: string;
  assignmentId?: string;
  teamNumber: number;
  alliance?: "red" | "blue" | "manual";
  otherTeams: { id: string; number: number; alliance: "red" | "blue" | "manual" }[];
  manualMatch?: { stage: string; label?: string };
};
type Score = { shoot: number; ferry: number };

const spots = [
  { id: "position-1", label: "Position 1", x: "18%", y: "10%" },
  { id: "position-2", label: "Position 2", x: "18%", y: "28%" },
  { id: "position-3", label: "Position 3", x: "18%", y: "46%" },
  { id: "position-4", label: "Position 4", x: "18%", y: "64%" },
  { id: "position-5", label: "Position 5", x: "18%", y: "82%" },
  { id: "position-6", label: "Position 6", x: "10%", y: "93%" },
  { id: "position-7", label: "Position 7", x: "26%", y: "93%" },
];
const tags = ["Intake broke", "Shooter broke", "Drive issue", "Electrical", "Other"];
const empty = (): Score => ({ shoot: 0, ferry: 0 });

export function RebuiltMatchForm({ eventId, matchId, teamId, assignmentId, teamNumber, alliance = "red", otherTeams, manualMatch }: Props) {
  const [noShow, setNoShow] = useState(false);
  const [spot, setSpot] = useState<string>();
  const [spotConfirmed, setSpotConfirmed] = useState(false);
  const [auto, setAuto] = useState(empty);
  const [teleop, setTeleop] = useState(empty);
  const [fouls, setFouls] = useState(0);
  const [defense, setDefense] = useState(false);
  const [level, setLevel] = useState(5);
  const [defended, setDefended] = useState<string[]>([]);
  const [broke, setBroke] = useState(false);
  const [tag, setTag] = useState("");
  const [otherBreakIssue, setOtherBreakIssue] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryId] = useState(() => {
    if (typeof window === "undefined") return "";
    const reportKey = assignmentId ?? (matchId ? `${matchId}:${teamId}` : `manual:${manualMatch?.stage ?? "other"}:${manualMatch?.label ?? ""}:${teamId}`);
    const key = `wildcard-pulse:scouting-entry:${reportKey}`;
    const existing = window.localStorage.getItem(key);
    const id = existing ?? crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
  });

  const disabled = noShow || saving || submitted;
  const total = (score: Score) => score.shoot + score.ferry;

  async function save(finalize: boolean) {
    if (saving || !entryId) return;
    setSaving(true);
    setMessage("");
    const supabase: any = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user?.id).limit(1).maybeSingle();
    if (!user || !member) {
      setMessage("Sign in again before saving.");
      setSaving(false);
      return;
    }
    const payload = {
      no_show: noShow, starting_spot: noShow ? null : spot, starting_spot_confirmed: noShow ? false : spotConfirmed,
      auto: { shoot: auto.shoot, ferry: auto.ferry }, teleop: { shoot: teleop.shoot, ferry: teleop.ferry },
      no_show_reason: noShow ? "No show" : null, auto_fuel: noShow ? 0 : total(auto), teleop_fuel: noShow ? 0 : total(teleop),
      fouls: noShow ? 0 : fouls, defense: noShow ? false : defense, defense_level: defense ? level : null,
      defended_teams: defense ? defended : [], robot_broke: noShow ? false : broke, break_timestamp: broke ? timestamp : null,
      break_tag: broke ? (tag === "Other" ? otherBreakIssue.trim() || "Other" : tag || null) : null, comments,
      report_source: manualMatch ? "manual" : "scheduled",
      manual_match: manualMatch ? { stage: manualMatch.stage, label: manualMatch.label || null } : null,
    };
    const submittedAt = finalize ? new Date().toISOString() : null;
    const { error } = await supabase.from("scouting_entries").upsert({
      id: entryId, organization_id: member.organization_id, event_id: eventId, team_id: teamId, match_id: matchId ?? null,
      assignment_id: assignmentId ?? null, scout_user_id: user.id, entry_type: "match", form_version: 3, payload,
      status: finalize ? "submitted" : "draft", submitted_at: submittedAt,
    }, { onConflict: "id" });
    if (!error && finalize && assignmentId) await supabase.from("scouting_assignments").update({ status: "complete", completed_at: submittedAt }).eq("id", assignmentId);
    if (!error && finalize) setSubmitted(true);
    setMessage(error ? "Could not save. Check your connection and try again." : finalize ? "Scout report submitted and visible in team history." : "Draft saved.");
    setSaving(false);
  }

  return <section className="scouting-card match-form">
    <div className="form-intro"><div className="form-kicker">{manualMatch ? `Manual match report · ${manualMatch.stage}${manualMatch.label ? ` · ${manualMatch.label}` : ""}` : `Match scouting · ${alliance} alliance`}</div><h2>Team {teamNumber}</h2><p>{manualMatch ? "This exception uses the same match-scouting fields and saves to the same team history as scheduled reports." : "Use the large controls while the match runs. Save a draft at any point; submit once the report is complete."}</p></div>
      <div className="form-section"><div className="section-title">Auton starting position</div><p className="muted">Five positions run along the field length; positions 6 and 7 are on the two alliance lines. Tap a position, then double-click it to confirm in a darker alliance color.</p><button type="button" className="button secondary mobile-full" disabled={saving || submitted} aria-pressed={noShow} onClick={() => setNoShow(!noShow)}>{noShow ? "Undo no show" : "Mark no show"}</button><fieldset disabled={disabled}><legend className="sr-only">Autonomous starting position</legend><div className={`field-map ${alliance === "blue" ? "flipped" : "red-side"}`}><div className="field-map-art" aria-hidden="true"/>{spots.map((item) => <button type="button" key={item.id} aria-label={`Start at ${item.label}`} aria-pressed={spot === item.id} style={{"--spot-x":item.x,"--spot-y":item.y} as CSSProperties} className={spot === item.id ? `spot ${alliance}${spotConfirmed ? " confirmed" : ""}` : "spot"} onClick={() => { setSpot((current) => current === item.id ? undefined : item.id); setSpotConfirmed(false); }} onDoubleClick={() => { setSpot(item.id); setSpotConfirmed(true); }}><span>{item.label.replace("Position ", "")}</span><small>{item.label}</small></button>)}</div></fieldset><div className="spot-choice" aria-live="polite">{spot ? `Starting position: ${spots.find((item)=>item.id===spot)?.label}${spotConfirmed ? " · confirmed" : ""}` : "Choose one of 7 starting positions."}</div></div>
    <fieldset disabled={disabled}><legend className="sr-only">Match scouting details</legend>
      <div className="form-section"><div className="section-title">Scoring</div><p className="muted">Track the two match periods only. Shoot and ferry stay separate; use ±10 for fast entry.</p><div className="scoring-table"><div className="scoring-head"><span>Period</span><span>Shoot</span><span>Ferry</span></div><ScoreRow label="Autonomous" value={auto} update={(key, value) => setAuto((score) => ({ ...score, [key]: Math.max(0, value) }))} autoRow /><ScoreRow label="Teleop" value={teleop} update={(key, value) => setTeleop((score) => ({ ...score, [key]: Math.max(0, value) }))} /></div></div>
      <div className="form-section"><div className="section-title">Fouls</div><Counter label="Fouls drawn by this team" value={fouls} by={1} setValue={setFouls} /></div>
      <div className="form-section"><div className="section-title">Defense</div><label className="option-toggle"><input type="checkbox" checked={defense} onChange={(event) => setDefense(event.target.checked)} /> Played defense</label>{defense && <><div className="field"><label htmlFor="defense-level">Defense level: {level} / 10</label><input id="defense-level" type="range" min="1" max="10" value={level} onChange={(event) => setLevel(Number(event.target.value))} /></div><p className="muted">Select the opposing robots this team defended. Only the three opponents are available.</p><div className="team-picker" aria-label="Opposing teams defended against">{otherTeams.map((team) => <button type="button" aria-pressed={defended.includes(team.id)} key={team.id} className={defended.includes(team.id) ? `team-pick ${team.alliance}` : "team-pick"} onClick={() => setDefended((current) => current.includes(team.id) ? current.filter((id) => id !== team.id) : current.length < 3 ? [...current, team.id] : current)}>{team.number}</button>)}</div></>}</div>
      <div className="form-section"><div className="section-title">Breakage · PulseCrew</div><label className="option-toggle"><input type="checkbox" checked={broke} onChange={(event) => setBroke(event.target.checked)} /> Robot broke / disabled</label>{broke && <div className="form-grid"><div className="field"><label htmlFor="break-timestamp">Timestamp (optional)</label><input id="break-timestamp" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} placeholder="1:42" inputMode="numeric" /></div><div className="field"><label htmlFor="break-issue">Issue</label><select id="break-issue" value={tag} onChange={(event) => setTag(event.target.value)}><option value="">Choose an issue…</option>{tags.map((item) => <option key={item}>{item}</option>)}</select></div>{tag === "Other" && <div className="field"><label htmlFor="break-other">Describe the issue</label><input id="break-other" value={otherBreakIssue} onChange={(event) => setOtherBreakIssue(event.target.value)} placeholder="e.g. chain came off" /></div>}</div>}</div>
    </fieldset>
    <div className="form-section"><div className="section-title">Comments</div><div className="field"><textarea id="match-comments" aria-label="Comments" disabled={saving || submitted} value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Free notes…" /></div></div>
    {noShow && <p className="trend">No show records all scoring as zero; comments remain available.</p>}
    <div className="form-actions"><button type="button" className="button secondary" disabled={saving || submitted} onClick={() => save(false)}>Save draft</button><button type="button" className="button" disabled={saving || submitted} onClick={() => save(true)}>{saving ? "Saving…" : submitted ? "Submitted" : "Submit scout report"}</button></div>
    {message && <p aria-live="polite" className={message.startsWith("Could") ? "error" : "trend"}>{message}</p>}
  </section>;
}

function ScoreRow({ label, value, update, autoRow }: { label: string; value: Score; update: (key: keyof Score, value: number) => void; autoRow?: boolean }) {
  return <div className={`scoring-row ${autoRow ? "auto-row" : ""}`}><strong>{label}</strong><MiniCounter label="Shoot" value={value.shoot} setValue={(next) => update("shoot", next)} /><MiniCounter label="Ferry" value={value.ferry} setValue={(next) => update("ferry", next)} /></div>;
}

function WholeNumberInput({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <input aria-label={label} type="text" inputMode="numeric" pattern="[0-9]*" value={value} onChange={(event) => { const next = event.currentTarget.value; if (next === "" || /^\d+$/.test(next)) setValue(next === "" ? 0 : Number(next)); }} />;
}

function MiniCounter({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <div className="counter" data-label={label}><button type="button" aria-label={`Subtract 10 ${label.toLowerCase()}`} onClick={() => setValue(Math.max(0, value - 10))}>−</button><WholeNumberInput label={`${label} count`} value={value} setValue={setValue}/><button type="button" aria-label={`Add 10 ${label.toLowerCase()}`} onClick={() => setValue(value + 10)}>+</button></div>;
}

function Counter({ label, value, by, setValue }: { label: string; value: number; by: number; setValue: (value: number) => void }) {
  return <div className="field"><label>{label}</label><div className="counter"><button type="button" aria-label={`Subtract ${by} foul`} onClick={() => setValue(Math.max(0, value - by))}>−</button><WholeNumberInput label={label} value={value} setValue={setValue}/><button type="button" aria-label={`Add ${by} foul`} onClick={() => setValue(value + by)}>+</button></div></div>;
}
