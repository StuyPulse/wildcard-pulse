import { createClient } from "@/lib/supabase/server";

export type ActiveEvent = { id: string; event_key: string; name: string; status: string };

export async function getActiveEvent(): Promise<ActiveEvent | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return null;
  const { data } = await supabase.from("events").select("id,event_key,name,status").eq("organization_id", membership.organization_id).eq("status", "active").maybeSingle();
  return data;
}
