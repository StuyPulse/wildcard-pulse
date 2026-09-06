"use client";

import { useState } from "react";
import { SearchableTeamSelect, type TeamOption } from "@/components/searchable-team-select";

export function CompareTeamPicker({ action, teams, initialA, initialB }: { action: string; teams: TeamOption[]; initialA?: string; initialB?: string }) {
  const [a, setA] = useState(initialA ?? teams[0]?.id ?? "");
  const [b, setB] = useState(initialB ?? teams[1]?.id ?? teams[0]?.id ?? "");
  return <form className="card compare-picker" action={action}><input type="hidden" name="a" value={a}/><input type="hidden" name="b" value={b}/><div className="field"><label htmlFor="compare-team-a">Team A</label><SearchableTeamSelect id="compare-team-a" value={a} onValueChange={setA} teams={teams} emptyLabel="Choose Team A…"/></div><div className="field"><label htmlFor="compare-team-b">Team B</label><SearchableTeamSelect id="compare-team-b" value={b} onValueChange={setB} teams={teams} emptyLabel="Choose Team B…"/></div><button className="button" disabled={!a || !b || a === b}>Compare</button></form>;
}
