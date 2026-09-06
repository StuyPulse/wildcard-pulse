"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Match = { id: string; key: string; number: number; type: string; red: string[]; blue: string[] };
type Team = { id: string; number: number; name: string };

function label(match: Match) {
  const suffix = match.key.split("_").pop() ?? "";
  const qualification = suffix.match(/^qm(\d+)$/);
  const final = suffix.match(/^f(\d+)m(\d+)$/);
  const semifinal = suffix.match(/^sf(\d+)m(\d+)$/);
  if (qualification) return `Qualification ${qualification[1]}`;
  if (final) return `Final ${final[1]} · Match ${final[2]}`;
  if (semifinal) return `Semifinal ${semifinal[1]} · Match ${semifinal[2]}`;
  return `${match.type} · ${suffix.toUpperCase()}`;
}

export function MatchScoutPicker({ matches, teams, initialMatchId = "" }: { matches: Match[]; teams: Team[]; initialMatchId?: string }) {
  const [matchId, setMatchId] = useState(initialMatchId);
  const [teamId, setTeamId] = useState("");
  const match = useMemo(() => matches.find((item) => item.id === matchId), [matches, matchId]);
  const allowedTeams = match ? teams.filter((team) => [...match.red, ...match.blue].includes(team.id)).sort((a, b) => a.number - b.number) : [];

  return <section className="scouting-card">
    <div className="form-intro">
      <div className="form-kicker">Scheduled match</div>
      <h2>Scout a robot from the imported schedule.</h2>
      <p>Choose the match first, then choose one of the six robots playing in it. Team buttons are alliance colored. Use the manual report beside this one for exceptions that are not in the schedule.</p>
    </div>
    <div className="form-grid">
      <div className="field">
        <label htmlFor="scheduled-match">Match</label>
        <select id="scheduled-match" value={matchId} onChange={(event) => { setMatchId(event.target.value); setTeamId(""); }}>
          <option value="">Choose a scheduled match…</option>
          {matches.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}
        </select>
      </div>
      <div className="field"><label>Robot</label>{match ? <div className="robot-picker" aria-label="Choose a robot">{allowedTeams.map((team) => { const alliance = match.red.includes(team.id) ? "red" : "blue"; return <button type="button" key={team.id} aria-pressed={team.id === teamId} className={`robot-pick ${alliance}${team.id === teamId ? " selected" : ""}`} onClick={() => setTeamId(team.id)}>{team.number} · {team.name}</button>; })}</div> : <p className="muted">Choose a scheduled match first.</p>}</div>
    </div>
    {match && <div className="match-roster"><span className="red">Red: {teams.filter((team) => match.red.includes(team.id)).map((team) => team.number).join(" · ")}</span><span className="blue">Blue: {teams.filter((team) => match.blue.includes(team.id)).map((team) => team.number).join(" · ")}</span></div>}
    <div className="form-actions">
      {teamId ? <Link className="button" href={`/scout/match/${matchId}?team=${teamId}`}>Open scheduled match form</Link> : <button className="button" disabled>Choose a match and robot</button>}
    </div>
  </section>;
}
