"use client";

import { useSyncExternalStore } from "react";

type Format = "date" | "time" | "date-time";

export function formatLocalDateTime(value: string | number | Date, format: Format = "date-time") {
  const date = new Date(value);
  const base = format === "date" ? { dateStyle: "medium" as const } : format === "time" ? { timeStyle: "short" as const } : { dateStyle: "medium" as const, timeStyle: "short" as const };
  return new Intl.DateTimeFormat(undefined, { ...base, timeZoneName: format === "date" ? undefined : "short" }).format(date);
}

export function LocalDateTime({ value, format = "date-time" }: { value?: string | number | Date | null; format?: Format }) {
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);
  const text = isClient ? value ? formatLocalDateTime(value, format) : "—" : "…";
  return <time dateTime={value ? new Date(value).toISOString() : undefined}>{text}</time>;
}
