import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = user ? await supabase.from("organization_members").select("role, organizations(name)").eq("user_id", user.id).limit(1).maybeSingle() : { data: null };
  const org = membership?.organizations as unknown as { name: string } | null;
  const { count: submissionCount } = await supabase.from("match_submissions").select("id", { count: "exact", head: true });
  const { data: assignments } = await supabase.from("scouting_assignments").select("id, status, assignment_type, matches(match_number), teams(team_number, name)").neq("status", "complete").limit(5);
  return <AppShell><PageHeader eyebrow={org ? `${org.name} · Competition workspace` : "Competition workspace"} title={org ? "Your event pulse." : "You’re almost ready."}/>
    {!membership ? <div className="card"><h2>Your account has been created.</h2><p className="muted" style={{marginTop:8,lineHeight:1.6}}>An admin needs to add you to an organization and assign your role before event data becomes visible. This is intentional: access is secured in Supabase RLS, not trusted from the browser.</p><Link className="button" href="/demo" style={{display:"inline-block",marginTop:16}}>View workspace preview</Link></div> : <><div className="grid stats"><div className="card"><div className="stat-label">Submissions received</div><div className="stat-value">{submissionCount ?? 0}</div><div className="trend">Live event total</div></div><div className="card"><div className="stat-label">Your role</div><div className="stat-value" style={{fontSize:22,textTransform:"capitalize"}}>{membership.role}</div><div className="trend">Permissions secured by RLS</div></div><div className="card"><div className="stat-label">Open assignments</div><div className="stat-value">{assignments?.length ?? 0}</div><div className="trend">Ready for the next match</div></div><div className="card"><div className="stat-label">Sync status</div><div className="stat-value" style={{fontSize:22}}>Online</div><div className="trend">Phase 1 direct upload</div></div></div><section className="card section"><div className="card-head"><h2>Your next assignments</h2><Link className="link" href="/scout/assignments">Open list →</Link></div>{assignments?.length ? assignments.map((a: any) => <div className="list-row" key={a.id}><div><strong>Q{a.matches?.match_number} · {a.teams?.team_number}</strong><div className="muted">{a.assignment_type} scouting · {a.teams?.name}</div></div><span className="tag pending">{a.status.replace("_", " ")}</span></div>) : <p className="muted">No assignments are currently waiting for you.</p>}</section></>}
  </AppShell>;
}
