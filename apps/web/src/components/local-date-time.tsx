"use client";

import { useSyncExternalStore } from "react";

type Format = "date" | "time" | "date-time";

export function formatLocalDateTime(value: string | number | Date, format: Format = "date-time") {
  const date = new Date(value);
  const options: Intl.DateTimeFormatOptions = format === "date"
    ? { year: "numeric", month: "short", day: "numeric" }
    : format === "time"
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      : { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function LocalDateTime({ value, format = "date-time" }: { value?: string | number | Date | null; format?: Format }) {
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);
  const text = isClient ? value ? formatLocalDateTime(value, format) : "—" : "…";
  return <time dateTime={value ? new Date(value).toISOString() : undefined}>{text}</time>;
}
