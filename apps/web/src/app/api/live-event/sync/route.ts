import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getViewerContext } from "@/lib/viewer-context";
import { syncLiveEvent } from "@/lib/tba-live-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const viewer = await getViewerContext();
  if (!viewer?.organizationId || !viewer.activeEvent) return NextResponse.json({ error: "No active event is available." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try {
    const result = await syncLiveEvent(viewer.activeEvent.id, viewer.organizationId);
    if (result.updated) {
      revalidatePath("/dashboard");
      revalidatePath(`/events/${viewer.activeEvent.event_key}/matches`);
      revalidatePath(`/events/${viewer.activeEvent.event_key}/summary`);
      revalidatePath(`/events/${viewer.activeEvent.event_key}/compare`);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Live TBA sync failed", error);
    return NextResponse.json({ error: "Live official data could not be refreshed." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
