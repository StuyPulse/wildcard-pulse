"use client";

import { useCallback, useState } from "react";
import { AutoPathDrawer } from "@/components/auto-path-drawer";
import { createClient } from "@/lib/supabase/client";

type EntryType = "pre_scout" | "pit";
type Team = { id: string; number: number; name: string };

const fields: Record<EntryType, [string, string, string][]> = {
  pre_scout: [["autos", "Autos: position, estimated fuel, path", "e.g. Position 3 → HUB, 20 fuel"], ["active_shift", "Active HUB strategy", "e.g. Scores from depot, then ferries"], ["inactive_shift", "Inactive HUB strategy", "e.g. Collects from floor and stages fuel"], ["traversal", "Bump / trench preference", "e.g. Uses trench both directions"], ["average_pieces", "Average game pieces scored", "e.g. 35–45 fuel per match"], ["with_them", "Strategy with them", "e.g. Leave depot lane open"], ["against_them", "Strategy against them", "e.g. Block their preferred lane"], ["notes", "Notes", "Useful scouting observations"]],
  pit: [["scout_names", "Scout name(s)", "e.g. Alex and Sam"], ["contact_info", "Team contact info", "e.g. pit lead name, email, phone"], ["driver_experience", "Driver experience", "e.g. Returning driver, 2 offseason events"], ["operator_experience", "Operator experience", "e.g. New operator; practiced weekly"], ["offseason", "Offseason drive-team plans", "e.g. Two events planned before build season"], ["dimensions", "Drivetrain dimensions without bumpers", "e.g. 28 in × 28 in"], ["hopper_capacity", "Maximum hopper capacity", "e.g. About 60 fuel"], ["teleop", "Teleop strategy / inactive HUB behavior", "e.g. Cycles depot → HUB; ferries while inactive"], ["scoring_area", "Preferred scoring area", "e.g. Near-side HUB"], ["traversal", "Traversal: bump and/or trench", "e.g. Trench only"], ["comments", "Additional comments", "Anything a strategist should know"]],
};
const title: Record<EntryType, string> = { pre_scout: "Pre scouting", pit: "Pit scouting" };

export function ManualScouting({ eventId, teams, type = "pre_scout" }: { eventId: string; teams: Team[]; type?: EntryType }) {
  const [teamId, setTeamId] = useState("");
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const sorted = [...teams].sort((a, b) => a.number - b.number);
  const set = (id: string, value: string) => setPayload((current) => ({ ...current, [id]: value }));
  const setAutoPath = useCallback((svg: string) => setPayload((current) => current.auto_routines_drawing === svg ? current : { ...current, auto_routines_drawing: svg }), []);

  async function submit() {
    if (!teamId) return setMessage("Choose a team.");
    const supabase: any = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", user?.id).limit(1).maybeSingle();
    if (!user || !member) return setMessage("Sign in again before submitting.");
    const { error } = await supabase.from("scouting_entries").insert({ organization_id: member.organization_id, event_id: eventId, team_id: teamId, scout_user_id: user.id, entry_type: type, form_version: 2, payload, status: "submitted", submitted_at: new Date().toISOString() });
    setMessage(error ? "Could not save. Check your connection and try again." : `${title[type]} saved to this team’s record.`);
  }

  return <section className="scouting-card"><div className="form-intro"><div className="form-kicker">{title[type]}</div><h2>Record what you observed.</h2><p>Choose a team from the active event. Example responses make the expected level of detail clear; climb is sourced from FIRST data and is not collected here.</p></div><div className="field"><label>Team</label><select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choose a team…</option>{sorted.map((team) => <option key={team.id} value={team.id}>{team.number} · {team.name}</option>)}</select></div><div className="form-grid">{fields[type].map(([id, label, placeholder]) => <div className="field" key={id}><label>{label}</label><textarea value={payload[id] ?? ""} onChange={(event) => set(id, event.target.value)} placeholder={placeholder}/></div>)}{type === "pit" && <><div className="field"><label htmlFor="program-language">Programming language</label><select id="program-language" value={payload.program_language ?? ""} onChange={(event) => set("program_language", event.target.value)}><option value="">Choose a language…</option><option>C++</option><option>Java</option><option>Python</option><option>Other</option></select></div>{payload.program_language === "Other" && <div className="field"><label htmlFor="program-language-other">Other language</label><input id="program-language-other" value={payload.program_language_other ?? ""} onChange={(event) => set("program_language_other", event.target.value)} placeholder="e.g. Kotlin"/></div>}<div className="field auto-path-field"><label>Autonomous routines / paths</label><AutoPathDrawer value={payload.auto_routines_drawing ?? ""} onChange={setAutoPath}/></div></>}</div><div className="form-actions"><button type="button" className="button" onClick={submit}>Submit {title[type]}</button></div>{message && <p aria-live="polite" className={message.startsWith("Could") ? "error" : "trend"}>{message}</p>}</section>;
}
