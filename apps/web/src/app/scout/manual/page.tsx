import { AppShell, PageHeader } from "@/components/app-shell";
import { getActiveEvent } from "@/lib/active-event";
import { createClient } from "@/lib/supabase/server";
import { ManualScouting } from "./manual-scouting";
export default async function ManualPage(){const event=await getActiveEvent();const supabase=await createClient();const{data}=event?await supabase.from('event_teams').select('team_id,teams(id,team_number,name)').eq('event_id',event.id):{data:[]};const teams=(data??[]).map((row:any)=>({id:row.team_id,number:row.teams?.team_number,name:row.teams?.name}));return <AppShell active="My assignments"><PageHeader eyebrow={event?.name??'No active event'} title="Manual scouting."/>{event?<ManualScouting eventId={event.id} teams={teams}/>:<section className="card"><p className="muted">An admin must set an active event before manual scouting can begin.</p></section>}</AppShell>}
