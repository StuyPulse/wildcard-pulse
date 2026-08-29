"use client";

import { useRouter } from "next/navigation";

type EventOption = { event_key: string; name: string; status: string };
export function EventSelector({ events, value, suffix = "teams" }: { events: EventOption[]; value: string; suffix?: string }) {
  const router = useRouter();
  return <div className="event-select"><label htmlFor="event-selector">Event</label><select id="event-selector" value={value} onChange={(event) => router.push(`/events/${event.target.value}/${suffix}`)}>{events.map((candidate) => <option key={candidate.event_key} value={candidate.event_key}>{candidate.name}{candidate.status === "active" ? " · active" : ""}</option>)}</select></div>;
}
