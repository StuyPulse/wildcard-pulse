import { getViewerContext } from "@/lib/viewer-context";

export type ActiveEvent = { id: string; event_key: string; name: string; status: string };

export async function getActiveEvent(): Promise<ActiveEvent | null> {
  return (await getViewerContext())?.activeEvent ?? null;
}
