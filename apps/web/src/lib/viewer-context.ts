import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ViewerContext = {
  userId: string;
  organizationId: string | null;
  role: "admin" | "scout" | "strategist" | "master" | "developer" | null;
  activeEvent: { id: string; event_key: string; name: string; status: string } | null;
};

/**
 * Loads the authenticated viewer and event context once per server render.
 * The proxy has already refreshed the session; getClaims verifies the cookie
 * without making every server component ask Auth for /user again.
 */
export const getViewerContext = cache(async (): Promise<ViewerContext | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { userId, organizationId: null, role: null, activeEvent: null };
  }

  const { data: activeEvent } = await supabase
    .from("events")
    .select("id,event_key,name,status")
    .eq("organization_id", membership.organization_id)
    .eq("status", "active")
    .maybeSingle();

  return {
    userId,
    organizationId: membership.organization_id,
    role: membership.role,
    activeEvent,
  };
});

export function viewerCanManage(viewer: ViewerContext | null) {
  return viewer?.role === "admin" || viewer?.role === "developer";
}
