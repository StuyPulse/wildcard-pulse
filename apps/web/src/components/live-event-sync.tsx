"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const pollMs = 30_000;

export function LiveEventSync({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let running = false;
    const sync = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const response = await fetch("/api/live-event/sync", { method: "POST", cache: "no-store" });
        const result = await response.json();
        if (response.ok && result.updated) router.refresh();
      } catch {
        // A temporary offline connection should not interrupt scouting.
      } finally {
        running = false;
      }
    };
    sync();
    const timer = window.setInterval(sync, pollMs);
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [active, router]);
  return null;
}
