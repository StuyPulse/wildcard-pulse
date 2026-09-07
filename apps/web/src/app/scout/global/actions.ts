"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewerContext } from "@/lib/viewer-context";
import { createAdminClient } from "@/lib/supabase/admin";

export type GlobalDocumentActionState = { error?: string; success?: string; documentUrl?: string };

const googleDocumentUrl = z.string().trim().max(2048).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:"
    && url.hostname === "docs.google.com"
    && /^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/[A-Za-z0-9_-]+(?:\/|$)/.test(url.pathname);
}, "Use a Google Docs, Sheets, or Slides share link.");

export async function saveGlobalDocument(_: GlobalDocumentActionState, formData: FormData): Promise<GlobalDocumentActionState> {
  const input = z.object({ eventId: z.string().uuid(), documentUrl: googleDocumentUrl }).safeParse({
    eventId: formData.get("eventId"),
    documentUrl: formData.get("documentUrl"),
  });
  if (!input.success) return { error: input.error.issues[0]?.message ?? "Use a valid Google document link." };

  const viewer = await getViewerContext();
  if (!viewer?.organizationId || !viewer.role || !["admin", "strategist", "developer"].includes(viewer.role)) {
    return { error: "Only an admin or strategist can set the shared global-scouting document." };
  }

  const database: any = createAdminClient();
  const { data: event, error: eventError } = await database.from("events")
    .select("id")
    .eq("id", input.data.eventId)
    .eq("organization_id", viewer.organizationId)
    .maybeSingle();
  if (eventError || !event) return { error: "That event is no longer available to your team." };

  const { error } = await database.from("event_global_documents").upsert({
    event_id: event.id,
    organization_id: viewer.organizationId,
    document_url: input.data.documentUrl,
    updated_by: viewer.userId,
  }, { onConflict: "event_id" });
  if (error) {
    console.error("Could not save global scouting document", error);
    return { error: "Could not save the document link. Please try again." };
  }

  revalidatePath("/scout/global");
  return { success: "Shared global-scouting document saved.", documentUrl: input.data.documentUrl };
}
