"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function previewUrl(url: string) { return url.replace(/\/edit(?:\?.*)?$/, "/preview"); }

export function GlobalDocument({ eventId, organizationId, initialUrl, canEdit }: { eventId: string; organizationId: string; initialUrl?: string | null; canEdit: boolean }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? "");
  const [message, setMessage] = useState("");
  async function save() {
    const next = url.trim();
    if (!/^https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[A-Za-z0-9_-]+/.test(next)) return setMessage("Use a Google Docs, Sheets, or Slides link.");
    const supabase: any = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setMessage("Sign in again before updating the document.");
    const { error } = await supabase.from("event_global_documents").upsert({ event_id: eventId, organization_id: organizationId, document_url: next, updated_by: user.id }, { onConflict: "event_id" });
    if (error) return setMessage("Could not save the document link. Check your role and try again.");
    setSavedUrl(next); setMessage("Global scouting document updated.");
  }
  return <section className="card global-document"><div className="card-head"><div><h2>Event global scouting</h2><p className="muted">One shared Google document for this event. It replaces the old team-entry form.</p></div>{savedUrl && <a className="button secondary" href={savedUrl} target="_blank" rel="noreferrer">Open in Google Docs ↗</a>}</div>{canEdit && <div className="global-document-editor"><div className="field"><label htmlFor="global-document-url">Google document link</label><input id="global-document-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://docs.google.com/document/d/.../edit"/></div><button type="button" className="button" onClick={save}>Save link</button></div>}{savedUrl ? <iframe className="global-document-frame" title="Event global scouting document" src={previewUrl(savedUrl)} /> : <p className="muted">An admin or strategist has not linked the event document yet.</p>}{message && <p aria-live="polite" className={message.startsWith("Could") || message.startsWith("Use") ? "error" : "trend"}>{message}</p>}</section>;
}
