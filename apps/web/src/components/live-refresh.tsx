"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function LiveRefresh({ tables, eventId }: { tables: string[]; eventId?: string }) {
  const router = useRouter();
  const tableKey = tables.join(":");

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: number | undefined;
    let lastRefresh = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        if (Date.now() - lastRefresh < 750) return;
        lastRefresh = Date.now();
        router.refresh();
      }, 350);
    };
    const channel = supabase.channel(`live:${tableKey}`);
    tableKey.split(":").forEach((table) => channel.on("postgres_changes", { event: "*", schema: "public", table, ...(eventId ? { filter: `event_id=eq.${eventId}` } : {}) }, refresh));
    channel.subscribe();
    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [router, tableKey, eventId]);

  return null;
}
