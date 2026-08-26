import { AppShell, PageHeader } from "@/components/app-shell";
import { getActiveEvent } from "@/lib/active-event";
import { createClient } from "@/lib/supabase/server";
import { ManualScouting } from "../manual/manual-scouting";
import { PitPhotoUpload } from "@/components/pit-photo-upload";
export default async function PitPage(){const event=await getActiveEvent();const supabase=await createClient();const{data}=event?await supabase.from("event_teams").select("team_id,teams(team_number,name)").eq("event_id",event.id):{data:[]};const teams=(data??[]).map((r:any)=>({id:r.team_id,number:r.teams?.team_number,name:r.teams?.name}));return <AppShell active="Manual scouting"><PageHeader eyebrow={event?.name??"No active event"} title="Pit scouting."/>{event?<><ManualScouting eventId={event.id} teams={teams} type="pit"/><PitPhotoUpload eventId={event.id} teams={teams}/></>:<section className="card"><p className="muted">Set an active event first.</p></section>}</AppShell>}
