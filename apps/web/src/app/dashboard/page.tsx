import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getViewerContext } from "@/lib/viewer-context";

export default async function Dashboard() {
  const viewer = await getViewerContext();
  const supabase = await createClient();
  const [{ data: organization }, { count: submissionCount }, { data: assignments }] = viewer?.organizationId && viewer.userId
    ? await Promise.all([
      supabase.from("organizations").select("name").eq("id", viewer.organizationId).maybeSingle(),
      viewer.activeEvent ? supabase.from("scouting_entries").select("id", { count: "exact", head: true }).eq("event_id", viewer.activeEvent.id).eq("status", "submitted") : Promise.resolve({ count: 0 }),
      supabase.from("scouting_assignments").select("id,status,assignment_type,matches(match_number),teams(team_number,name)").eq("scout_user_id", viewer.userId).neq("status", "complete").order("created_at", { ascending: false }).limit(5),
    ])
    : [{ data: null }, { count: 0 }, { data: [] }];
  return <AppShell><PageHeader eyebrow={organization ? `${organization.name} · Competition workspace` : "Competition workspace"} title={organization ? "Your event pulse." : "You’re almost ready."}/>
    {!viewer?.organizationId ? <div className="card"><h2>Your account has been created.</h2><p className="muted" style={{marginTop:8,lineHeight:1.6}}>An admin needs to add you to an organization and assign your role before event data becomes visible. This is intentional: access is secured in Supabase RLS, not trusted from the browser.</p><Link className="button" href="/demo" style={{display:"inline-block",marginTop:16}}>View workspace preview</Link></div> : <><div className="grid stats"><div className="card"><div className="stat-label">Submissions received</div><div className="stat-value">{submissionCount ?? 0}</div><div className="trend">Active event total</div></div><div className="card"><div className="stat-label">Your role</div><div className="stat-value" style={{fontSize:22,textTransform:"capitalize"}}>{viewer.role}</div><div className="trend">Permissions secured by RLS</div></div><div className="card"><div className="stat-label">Open assignments</div><div className="stat-value">{assignments?.length ?? 0}</div><div className="trend">Ready for the next match</div></div><div className="card"><div className="stat-label">Sync status</div><div className="stat-value" style={{fontSize:22}}>Online</div><div className="trend">Phase 1 direct upload</div></div></div><section className="card section"><div className="card-head"><h2>Your next assignments</h2><Link className="link" href="/scout/assignments">Open list →</Link></div>{assignments?.length ? assignments.map((a: any) => <div className="list-row" key={a.id}><div><strong>Q{a.matches?.match_number} · {a.teams?.team_number}</strong><div className="muted">{a.assignment_type} scouting · {a.teams?.name}</div></div><span className="tag pending">{a.status.replace("_", " ")}</span></div>) : <p className="muted">No assignments are currently waiting for you.</p>}</section></>}
  </AppShell>;
}
