"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { LocalDateTime } from "@/components/local-date-time";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string; color: string; sort_order: number };
type Team = { id: string; team_number: number; name: string };
type Ranking = { id: string; team_id: string; category_id: string | null; rank: number | null; note: string; created_by: string; updated_by: string; updated_at: string };
type Change = { id: string; team_id: string; action: "baseline" | "created" | "updated" | "deleted"; before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null; created_at: string; teams?: { team_number: number; name: string } | null; profiles?: { display_name: string } | null };
const tierNames = ["Elite", "Good", "Mid", "Meh", "SNS", "DNP"];

export function PicklistBoard({ organizationId, eventId, userId, canEdit, categories: initialCategories, teams, rankings: initialRankings, changes }: { organizationId: string; eventId: string; userId: string; canEdit: boolean; categories: Category[]; teams: Team[]; rankings: Ranking[]; changes: Change[] }) {
  const [rankings, setRankings] = useState(initialRankings);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const categories = useMemo(() => tierNames.map((name) => initialCategories.find((category) => category.name.toLowerCase() === name.toLowerCase())).filter((category): category is Category => Boolean(category)), [initialCategories]);
  const byTeam = useMemo(() => new Map(rankings.map((ranking) => [ranking.team_id, ranking])), [rankings]);
  const fallbackTier = categories.find((category) => category.name === "Meh")?.id ?? categories[0]?.id ?? null;
  const teamsInTier = (categoryId: string) => teams.filter((team) => (byTeam.get(team.id)?.category_id ?? fallbackTier) === categoryId).sort((left, right) => (byTeam.get(left.id)?.rank ?? Number.MAX_SAFE_INTEGER) - (byTeam.get(right.id)?.rank ?? Number.MAX_SAFE_INTEGER) || left.team_number - right.team_number);

  async function saveTeam(teamId: string, changes: Partial<Pick<Ranking, "rank" | "category_id" | "note">>, successMessage: string) {
    if (!canEdit) return;
    const current = byTeam.get(teamId);
    const teamIndex = teams.findIndex((team) => team.id === teamId);
    setSavingIds((currentIds) => [...new Set([...currentIds, teamId])]);
    const supabase: any = createClient();
    const { data, error } = await supabase.from("shared_picklist_rankings").upsert({ organization_id: organizationId, event_id: eventId, team_id: teamId, created_by: current?.created_by ?? userId, updated_by: userId, rank: changes.rank ?? current?.rank ?? teamIndex + 1, category_id: changes.category_id ?? current?.category_id ?? fallbackTier, note: changes.note ?? current?.note ?? "" }, { onConflict: "event_id,team_id" }).select("id,team_id,category_id,rank,note,created_by,updated_by,updated_at").single();
    setSavingIds((currentIds) => currentIds.filter((id) => id !== teamId));
    if (error) { setNotice("Could not save that change. Try again."); return; }
    setRankings((currentRankings) => [...currentRankings.filter((ranking) => ranking.id !== data.id), data]);
    setNotice(successMessage);
  }

  async function moveWithinTier(teamId: string, categoryId: string, direction: -1 | 1) {
    const tierTeams = teamsInTier(categoryId); const index = tierTeams.findIndex((team) => team.id === teamId); const neighbor = tierTeams[index + direction];
    if (!neighbor) return;
    const currentRank = byTeam.get(teamId)?.rank ?? index + 1;
    const neighborRank = byTeam.get(neighbor.id)?.rank ?? index + direction + 1;
    await Promise.all([saveTeam(teamId, { rank: neighborRank }, "Tier order saved automatically."), saveTeam(neighbor.id, { rank: currentRank }, "Tier order saved automatically.")]);
  }

  return <><section className="card picklist-guide"><div><h2>Shared strategy tiers</h2><p className="muted">Everyone sees one board: <strong>Elite → Good → Mid → Meh → SNS → DNP.</strong> Choose a tier to move a team; it saves automatically. Use arrows to set the order inside a tier.</p></div>{!canEdit && <span className="tag pending">View only</span>}<span className="picklist-autosave"><Check size={15} aria-hidden="true"/> Changes save automatically</span></section><section className="picklist-tier-board" aria-label="Shared picklist tiers">{categories.map((category) => { const tierTeams = teamsInTier(category.id); return <section className="card picklist-tier" style={{ "--tier": category.color } as CSSProperties} key={category.id}><div className="picklist-tier-head"><div><span className="picklist-tier-label">{category.name}</span><p className="muted">{tierTeams.length} teams</p></div></div><div className="picklist-tier-list">{tierTeams.map((team, index) => <TierTeamRow key={team.id} team={team} ranking={byTeam.get(team.id)} categories={categories} tierIndex={index} tierSize={tierTeams.length} canEdit={canEdit} saving={savingIds.includes(team.id)} onTierChange={(categoryId) => saveTeam(team.id, { category_id: categoryId }, `${team.team_number} moved to ${categories.find((item) => item.id === categoryId)?.name ?? "that tier"}.`)} onMove={(direction) => moveWithinTier(team.id, category.id, direction)} onNote={(note) => saveTeam(team.id, { note }, `Note saved for Team ${team.team_number}.`)}/>)}</div>{!tierTeams.length && <p className="muted picklist-empty-tier">Move a team here using its tier selector.</p>}</section>; })}</section>{notice && <p className="trend" aria-live="polite">{notice}</p>}<section className="card section"><div className="card-head"><div><h2>Picklist activity</h2><p className="muted">The latest shared changes, including who made them.</p></div><span className="muted">{changes.length} recent changes</span></div><div className="picklist-activity">{changes.length ? changes.map((change) => <ChangeRow key={change.id} change={change} categories={categories}/>) : <p className="muted">No shared edits have been recorded yet.</p>}</div></section></>;
}

function TierTeamRow({ team, ranking, categories, tierIndex, tierSize, canEdit, saving, onTierChange, onMove, onNote }: { team: Team; ranking?: Ranking; categories: Category[]; tierIndex: number; tierSize: number; canEdit: boolean; saving: boolean; onTierChange: (categoryId: string) => void; onMove: (direction: -1 | 1) => void; onNote: (note: string) => void }) {
  const currentTier = ranking?.category_id ?? categories.find((category) => category.name === "Meh")?.id ?? categories[0]?.id ?? "";
  return <article className="picklist-team-row"><div className="picklist-team-name"><span className="picklist-team-position">{tierIndex + 1}</span><span><strong>{team.team_number}</strong><small>{team.name}</small></span></div>{canEdit ? <><label className="picklist-tier-select"><span>Tier</span><select value={currentTier} disabled={saving} onChange={(event) => onTierChange(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="picklist-order-buttons"><button type="button" disabled={saving || tierIndex === 0} aria-label={`Move Team ${team.team_number} higher in this tier`} onClick={() => onMove(-1)}><ArrowUp size={16}/><span>Higher</span></button><button type="button" disabled={saving || tierIndex === tierSize - 1} aria-label={`Move Team ${team.team_number} lower in this tier`} onClick={() => onMove(1)}><ArrowDown size={16}/><span>Lower</span></button></div><details className="picklist-note"><summary>{ranking?.note ? "Edit note" : "Add note"}</summary><textarea defaultValue={ranking?.note ?? ""} maxLength={2000} placeholder="Why is this team in this tier?" onBlur={(event) => { if (event.currentTarget.value.trim() !== (ranking?.note ?? "")) onNote(event.currentTarget.value.trim()); }}/></details><span className="picklist-save-state" aria-live="polite">{saving ? "Saving…" : "Saved"}</span></> : <><span className="picklist-read-tier">{categories.find((category) => category.id === currentTier)?.name ?? "Unassigned"}</span>{ranking?.note && <span className="muted">{ranking.note}</span>}</>}</article>;
}

function ChangeRow({ change, categories }: { change: Change; categories: Category[] }) {
  const before = change.before_state ?? {}; const after = change.after_state ?? {};
  const category = (id: unknown) => typeof id === "string" ? categories.find((item) => item.id === id)?.name ?? "Unassigned" : "Unassigned";
  const details = change.action === "baseline" ? "Adopted as the initial shared ranking" : change.action === "created" ? `Added to ${category(after.category_id)}` : [before.rank !== after.rank && "Changed tier order", before.category_id !== after.category_id && `Tier ${category(before.category_id)} → ${category(after.category_id)}`, before.note !== after.note && "Updated note"].filter(Boolean).join(" · ") || "Updated shared ranking";
  return <div className="picklist-activity-row"><div><strong>{change.teams ? `${change.teams.team_number} · ${change.teams.name}` : "Team"}</strong><span>{details}</span></div><small>{change.profiles?.display_name ?? "Unknown member"} · <LocalDateTime value={change.created_at}/></small></div>;
}
