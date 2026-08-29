"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function LiveRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  const tableKey = tables.join(":");

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: number | undefined;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => router.refresh(), 150);
    };
    const channel = supabase.channel(`live:${tableKey}`);
    tableKey.split(":").forEach((table) => channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh));
    channel.subscribe();
    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [router, tableKey]);

  return null;
}
