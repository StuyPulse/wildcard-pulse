import { AppShell, PageHeader } from "@/components/app-shell";
import { getActiveEvent } from "@/lib/active-event";
import { createClient } from "@/lib/supabase/server";
import { ManualScouting } from "../manual/manual-scouting";
export default async function PreScoutPage(){const event=await getActiveEvent();const supabase=await createClient();const{data}=event?await supabase.from("event_teams").select("team_id,teams(team_number,name)").eq("event_id",event.id):{data:[]};const teams=(data??[]).map((r:any)=>({id:r.team_id,number:r.teams?.team_number,name:r.teams?.name}));return <AppShell active="Manual scouting"><PageHeader eyebrow={event?.name??"No active event"} title="Pre scouting."/>{event?<ManualScouting eventId={event.id} teams={teams} type="pre_scout"/>:<section className="card"><p className="muted">Set an active event first.</p></section>}</AppShell>}
