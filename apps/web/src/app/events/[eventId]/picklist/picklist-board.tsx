"use client";

import { ArrowDown, ArrowUp, Check, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState, type CSSProperties, type DragEvent, type FormEvent } from "react";
import { LocalDateTime } from "@/components/local-date-time";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string; color: string; sort_order: number };
type Team = { id: string; team_number: number; name: string; opr?: number };
type Ranking = { id: string; team_id: string; category_id: string | null; rank: number | null; note: string; selected: boolean; created_by: string; updated_by: string; updated_at: string };
type Change = { id: string; team_id: string; action: "baseline" | "created" | "updated" | "deleted"; before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null; created_at: string; teams?: { team_number: number; name: string } | null; profiles?: { display_name: string } | null };

export function PicklistBoard({ organizationId, eventId, userId, canEdit, categories: initialCategories, teams, rankings: initialRankings, changes }: { organizationId: string; eventId: string; userId: string; canEdit: boolean; categories: Category[]; teams: Team[]; rankings: Ranking[]; changes: Change[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [rankings, setRankings] = useState(initialRankings);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [newTierName, setNewTierName] = useState("");
  const [newTierColor, setNewTierColor] = useState("#64748b");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [undoingChangeAt, setUndoingChangeAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"board" | "history">("board");
  const orderedCategories = useMemo(() => [...categories].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name)), [categories]);
  const byTeam = useMemo(() => new Map(rankings.map((ranking) => [ranking.team_id, ranking])), [rankings]);
  const changeGroups = useMemo(() => {
    const groups = new Map<string, Change[]>();
    for (const change of changes) groups.set(change.created_at, [...(groups.get(change.created_at) ?? []), change]);
    return groups;
  }, [changes]);
  const latestChangeIds = useMemo(() => {
    const latest = new Set<string>(); const seenTeams = new Set<string>();
    for (const change of changes) if (!seenTeams.has(change.team_id)) { latest.add(change.id); seenTeams.add(change.team_id); }
    return latest;
  }, [changes]);
  const fallbackTier = orderedCategories[0]?.id ?? null;
  const teamsInTier = (categoryId: string) => teams.filter((team) => (byTeam.get(team.id)?.category_id ?? fallbackTier) === categoryId).sort((left, right) => (byTeam.get(left.id)?.rank ?? Number.MAX_SAFE_INTEGER) - (byTeam.get(right.id)?.rank ?? Number.MAX_SAFE_INTEGER) || (right.opr ?? 0) - (left.opr ?? 0) || left.team_number - right.team_number);

  const rankingPayload = (team: Team, changes: Partial<Pick<Ranking, "rank" | "category_id" | "note" | "selected">>) => {
    const current = byTeam.get(team.id);
    const hasChange = (field: keyof Pick<Ranking, "rank" | "category_id" | "note" | "selected">) => Object.prototype.hasOwnProperty.call(changes, field);
    return { organization_id: organizationId, event_id: eventId, team_id: team.id, created_by: current?.created_by ?? userId, updated_by: userId, rank: hasChange("rank") ? changes.rank : current?.rank ?? teams.findIndex((item) => item.id === team.id) + 1, category_id: hasChange("category_id") ? changes.category_id : current?.category_id ?? fallbackTier, note: hasChange("note") ? changes.note : current?.note ?? "", selected: hasChange("selected") ? changes.selected : current?.selected ?? false };
  };

  async function persistTeams(next: { team: Team; changes: Partial<Pick<Ranking, "rank" | "category_id" | "note" | "selected">> }[], successMessage: string) {
    if (!canEdit || !next.length) return false;
    const ids = next.map((item) => item.team.id);
    setSavingIds((currentIds) => [...new Set([...currentIds, ...ids])]);
    const supabase: any = createClient();
    const { data, error } = await supabase.from("shared_picklist_rankings").upsert(next.map((item) => rankingPayload(item.team, item.changes)), { onConflict: "event_id,team_id" }).select("id,team_id,category_id,rank,note,selected,created_by,updated_by,updated_at");
    setSavingIds((currentIds) => currentIds.filter((id) => !ids.includes(id)));
    if (error) { setNotice("Could not save that change. Try again."); return false; }
    setRankings((currentRankings) => {
      const saved = new Map((data ?? []).map((ranking: Ranking) => [ranking.team_id, ranking]));
      return currentRankings.filter((ranking) => !saved.has(ranking.team_id)).concat(data ?? []);
    });
    setNotice(successMessage);
    return true;
  }

  async function moveWithinTier(teamId: string, categoryId: string, direction: -1 | 1) {
    const tierTeams = teamsInTier(categoryId); const index = tierTeams.findIndex((team) => team.id === teamId); const neighbor = index + direction;
    if (neighbor < 0 || neighbor >= tierTeams.length) return;
    [tierTeams[index], tierTeams[neighbor]] = [tierTeams[neighbor], tierTeams[index]];
    await persistTeams(tierTeams.map((team, rank) => ({ team, changes: { category_id: categoryId, rank: rank + 1 } })), "Order saved.");
  }

  async function moveToTier(teamId: string, categoryId: string, beforeTeamId?: string) {
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;
    const tierTeams = teamsInTier(categoryId).filter((item) => item.id !== teamId);
    const target = beforeTeamId ? tierTeams.findIndex((item) => item.id === beforeTeamId) : tierTeams.length;
    tierTeams.splice(target < 0 ? tierTeams.length : target, 0, team);
    await persistTeams(tierTeams.map((item, rank) => ({ team: item, changes: { category_id: categoryId, rank: rank + 1 } })), `${team.team_number} moved.`);
  }

  async function addTier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTierName.trim();
    if (!name || !canEdit) return;
    if (orderedCategories.some((category) => category.name.toLowerCase() === name.toLowerCase())) { setNotice("That tier already exists."); return; }
    const supabase: any = createClient();
    const { data, error } = await supabase.from("picklist_categories").insert({ organization_id: organizationId, name, color: newTierColor, sort_order: orderedCategories.length, created_by: userId }).select("id,name,color,sort_order").single();
    if (error) { setNotice("Could not add that tier. Try again."); return; }
    setCategories((current) => [...current, data]); setNewTierName(""); setNotice(`${name} tier added.`);
  }

  async function moveTier(categoryId: string, direction: -1 | 1) {
    const index = orderedCategories.findIndex((category) => category.id === categoryId); const neighbor = index + direction;
    if (!canEdit || neighbor < 0 || neighbor >= orderedCategories.length) return;
    const next = [...orderedCategories]; [next[index], next[neighbor]] = [next[neighbor], next[index]];
    const supabase: any = createClient();
    const { error } = await Promise.all(next.map((category, sortOrder) => supabase.from("picklist_categories").update({ sort_order: sortOrder }).eq("id", category.id))).then((results) => ({ error: results.find((result) => result.error)?.error }));
    if (error) { setNotice("Could not reorder tiers. Try again."); return; }
    setCategories(next.map((category, sortOrder) => ({ ...category, sort_order: sortOrder }))); setNotice("Tier order saved.");
  }

  async function removeTier(categoryId: string) {
    const index = orderedCategories.findIndex((category) => category.id === categoryId);
    if (!canEdit || orderedCategories.length <= 1 || index < 0) return;
    const category = orderedCategories[index]; const fallback = orderedCategories[index + 1] ?? orderedCategories[index - 1]; const affected = teamsInTier(categoryId);
    if (affected.length && !await persistTeams(affected.map((team, rank) => ({ team, changes: { category_id: fallback.id, rank: teamsInTier(fallback.id).length + rank + 1 } })), `${category.name} teams moved to ${fallback.name}.`)) return;
    const supabase: any = createClient(); const { error } = await supabase.from("picklist_categories").delete().eq("id", categoryId);
    if (error) { setNotice("Could not remove that tier. Try again."); return; }
    setCategories((current) => current.filter((item) => item.id !== categoryId)); setNotice(`${category.name} tier removed.`);
  }

  const startDrag = (event: DragEvent<HTMLElement>, teamId: string) => { if (!canEdit) return; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", teamId); setDraggingId(teamId); };
  const finishDrag = () => { setDraggingId(null); setDropTargetId(null); };
  const dropOn = (event: DragEvent<HTMLElement>, categoryId: string, beforeTeamId?: string) => { event.preventDefault(); event.stopPropagation(); const teamId = event.dataTransfer.getData("text/plain") || draggingId; if (teamId) void moveToTier(teamId, categoryId, beforeTeamId); finishDrag(); };

  async function undoChanges(group: Change[]) {
    if (!canEdit || !group.length) return;
    const restores = group.flatMap((change) => {
      const team = teams.find((item) => item.id === change.team_id);
      const before = restoreRankingState(change.before_state);
      return team && before ? [{ team, changes: before }] : [];
    });
    if (restores.length !== group.length) { setNotice("That history entry cannot be undone safely."); return; }
    const changeAt = group[0].created_at;
    setUndoingChangeAt(changeAt);
    await persistTeams(restores, restores.length === 1 ? `Restored Team ${restores[0].team.team_number}.` : `Restored ${restores.length} team changes.`);
    setUndoingChangeAt(null);
  }

  return <>
    <section className="card picklist-workspace">
      <div className="picklist-workspace-head">
        <div className="picklist-tabs" role="tablist" aria-label="Picklist sections">
          <button type="button" role="tab" aria-selected={activeTab === "board"} className={activeTab === "board" ? "active" : ""} onClick={() => setActiveTab("board")}>Board</button>
          <button type="button" role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>History <span>{changes.length}</span></button>
        </div>
        {!canEdit && <span className="tag pending">View only</span>}
      </div>
      {activeTab === "board" && <div className="picklist-tier-manager" aria-label="Tier management">
        <span className="picklist-manager-label">Tiers</span>
        <div className="picklist-tier-controls">
          {orderedCategories.map((category, categoryIndex) => <div className="picklist-tier-control" style={{ "--tier": category.color } as CSSProperties} key={category.id}>
            <span>{category.name}</span>
            {canEdit && <div className="picklist-tier-actions">
              <button type="button" disabled={categoryIndex === 0} aria-label={`Move ${category.name} tier up`} onClick={() => void moveTier(category.id, -1)}><ArrowUp size={14}/></button>
              <button type="button" disabled={categoryIndex === orderedCategories.length - 1} aria-label={`Move ${category.name} tier down`} onClick={() => void moveTier(category.id, 1)}><ArrowDown size={14}/></button>
              <button type="button" disabled={orderedCategories.length <= 1} aria-label={`Remove ${category.name} tier`} onClick={() => void removeTier(category.id)}><Trash2 size={14}/></button>
            </div>}
          </div>)}
          {canEdit && <form className="picklist-tier-form" onSubmit={addTier}>
            <label className="sr-only" htmlFor="new-picklist-tier">New tier name</label>
            <input id="new-picklist-tier" value={newTierName} onChange={(event) => setNewTierName(event.target.value)} maxLength={48} placeholder="New tier" />
            <label className="sr-only" htmlFor="new-picklist-tier-color">Tier color</label>
            <input id="new-picklist-tier-color" type="color" value={newTierColor} onChange={(event) => setNewTierColor(event.target.value)} />
            <button type="submit" className="button secondary" disabled={!newTierName.trim()}><Plus size={16} aria-hidden="true"/> Add</button>
          </form>}
        </div>
      </div>}
    </section>

    {activeTab === "board" ? <section className="picklist-tier-board" aria-label="Shared picklist tiers">
      {orderedCategories.map((category) => {
        const tierTeams = teamsInTier(category.id);
        return <section className="card picklist-tier" style={{ "--tier": category.color } as CSSProperties} key={category.id} onDragOver={(event) => { if (canEdit) event.preventDefault(); }} onDrop={(event) => dropOn(event, category.id)}>
          <div className="picklist-tier-head"><div><span className="picklist-tier-label">{category.name}</span><p className="muted">{tierTeams.length} teams</p></div></div>
          <div className="picklist-tier-list">{tierTeams.map((team, index) => <TierTeamRow key={team.id} team={team} ranking={byTeam.get(team.id)} categories={orderedCategories} tierIndex={index} tierSize={tierTeams.length} canEdit={canEdit} saving={savingIds.includes(team.id)} dragging={draggingId === team.id} dropTarget={dropTargetId === team.id} onDragStart={(event) => startDrag(event, team.id)} onDragEnd={finishDrag} onDragOver={(event) => { if (canEdit) { event.preventDefault(); setDropTargetId(team.id); } }} onDrop={(event) => dropOn(event, category.id, team.id)} onTierChange={(categoryId) => void moveToTier(team.id, categoryId)} onMove={(direction) => void moveWithinTier(team.id, category.id, direction)} onNote={(note) => void persistTeams([{ team, changes: { note } }], `Note saved for Team ${team.team_number}.`)} onSelected={(selected) => void persistTeams([{ team, changes: { selected } }], selected ? `Team ${team.team_number} selected.` : `Team ${team.team_number} unselected.`)}/>)}</div>
          {!tierTeams.length && <p className="muted picklist-empty-tier">Drop a team here.</p>}
        </section>;
      })}
    </section> : <section className="card section picklist-history" role="tabpanel">
      <div className="card-head"><h2>History</h2><span className="muted">{changes.length} recent changes</span></div>
      <div className="picklist-activity">{changes.length ? changes.map((change) => {
        const group = changeGroups.get(change.created_at) ?? [change];
        const isGroupLead = group[0]?.id === change.id;
        const canUndo = canEdit && isGroupLead && group.every((item) => item.action === "updated" && restoreRankingState(item.before_state) && latestChangeIds.has(item.id));
        return <ChangeRow key={change.id} change={change} categories={orderedCategories} canUndo={canUndo} undoing={undoingChangeAt === change.created_at} onUndo={() => void undoChanges(group)}/>;
      }) : <p className="muted">No shared edits have been recorded yet.</p>}</div>
    </section>}
    {notice && <p className="trend" aria-live="polite">{notice}</p>}
  </>;
}

function TierTeamRow({ team, ranking, categories, tierIndex, tierSize, canEdit, saving, dragging, dropTarget, onDragStart, onDragEnd, onDragOver, onDrop, onTierChange, onMove, onNote, onSelected }: { team: Team; ranking?: Ranking; categories: Category[]; tierIndex: number; tierSize: number; canEdit: boolean; saving: boolean; dragging: boolean; dropTarget: boolean; onDragStart: (event: DragEvent<HTMLElement>) => void; onDragEnd: () => void; onDragOver: (event: DragEvent<HTMLElement>) => void; onDrop: (event: DragEvent<HTMLElement>) => void; onTierChange: (categoryId: string) => void; onMove: (direction: -1 | 1) => void; onNote: (note: string) => void; onSelected: (selected: boolean) => void }) {
  const [note, setNote] = useState(ranking?.note ?? "");
  const currentTier = ranking?.category_id ?? categories[0]?.id ?? "";
  const selected = ranking?.selected ?? false;
  const teamIdentity = <div className="picklist-team-name">{canEdit && <GripVertical className="picklist-drag-handle" size={18} aria-hidden="true"/>}<span className="picklist-team-position">{tierIndex + 1}</span><span><strong>{team.team_number}</strong><small>{team.name}</small></span></div>;
  const noteControl = canEdit ? <label className="picklist-note"><span className="sr-only">Notes for Team {team.team_number}</span><textarea value={note} maxLength={2000} disabled={saving} placeholder="Notes" onChange={(event) => setNote(event.target.value)} onBlur={() => { if (note.trim() !== (ranking?.note ?? "")) onNote(note.trim()); }}/></label> : <p className="picklist-read-note">{ranking?.note || "—"}</p>;
  return <article draggable={canEdit} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop} className={`picklist-team-row${dragging ? " dragging" : ""}${dropTarget ? " drop-target" : ""}`}>
    {teamIdentity}
    {noteControl}
    {canEdit ? <>
      <label className={selected ? "picklist-selected is-selected" : "picklist-selected"}><input type="checkbox" checked={selected} disabled={saving} onChange={(event) => onSelected(event.target.checked)} /><Check size={14} aria-hidden="true"/><span>Selected</span></label>
      <label className="picklist-tier-select"><span className="sr-only">Tier</span><select value={currentTier} disabled={saving} onChange={(event) => onTierChange(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="picklist-order-buttons"><button type="button" disabled={saving || tierIndex === 0} aria-label={`Move Team ${team.team_number} up`} onClick={() => onMove(-1)}><ArrowUp size={16}/></button><button type="button" disabled={saving || tierIndex === tierSize - 1} aria-label={`Move Team ${team.team_number} down`} onClick={() => onMove(1)}><ArrowDown size={16}/></button></div>
      <span className="picklist-save-state" aria-live="polite">{saving ? "Saving…" : "Saved"}</span>
    </> : <><span className={selected ? "picklist-selected is-selected" : "picklist-selected"}>{selected && <Check size={14} aria-hidden="true"/>}<span>Selected</span></span><span className="picklist-read-tier">{categories.find((category) => category.id === currentTier)?.name ?? "Unassigned"}</span></>}
  </article>;
}

function restoreRankingState(state: Change["before_state"]): Partial<Pick<Ranking, "rank" | "category_id" | "note" | "selected">> | null {
  if (!state) return null;
  const restored: Partial<Pick<Ranking, "rank" | "category_id" | "note" | "selected">> = {};
  if (typeof state.rank === "number") restored.rank = state.rank;
  if (typeof state.category_id === "string" || state.category_id === null) restored.category_id = state.category_id;
  if (typeof state.note === "string") restored.note = state.note;
  if (typeof state.selected === "boolean") restored.selected = state.selected;
  return Object.keys(restored).length ? restored : null;
}

function ChangeRow({ change, categories, canUndo, undoing, onUndo }: { change: Change; categories: Category[]; canUndo: boolean; undoing: boolean; onUndo: () => void }) {
  const before = change.before_state ?? {}; const after = change.after_state ?? {};
  const category = (id: unknown) => typeof id === "string" ? categories.find((item) => item.id === id)?.name ?? "Unassigned" : "Unassigned";
  const details = change.action === "baseline" ? "Adopted as the initial shared ranking" : change.action === "created" ? `Added to ${category(after.category_id)}` : [before.rank !== after.rank && "Changed tier order", before.category_id !== after.category_id && `Tier ${category(before.category_id)} → ${category(after.category_id)}`, before.note !== after.note && "Updated note", before.selected !== after.selected && (after.selected ? "Selected" : "Unselected")].filter(Boolean).join(" · ") || "Updated shared ranking";
  return <div className="picklist-activity-row"><div><strong>{change.teams ? `${change.teams.team_number} · ${change.teams.name}` : "Team"}</strong><span>{details}</span></div><div className="picklist-activity-actions"><small>{change.profiles?.display_name ?? "Unknown member"} · <LocalDateTime value={change.created_at}/></small>{canUndo && <button type="button" className="picklist-undo-button" disabled={undoing} onClick={onUndo}><RotateCcw size={13} aria-hidden="true"/>{undoing ? "Undoing…" : "Undo"}</button>}</div></div>;
}
