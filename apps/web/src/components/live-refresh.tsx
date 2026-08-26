"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function LiveRefresh({tables}:{tables:string[]}){const router=useRouter();useEffect(()=>{const supabase=createClient();const channel=supabase.channel(`live:${tables.join(':')}`);tables.forEach(table=>channel.on('postgres_changes',{event:'*',schema:'public',table},()=>router.refresh()));channel.subscribe();return()=>{supabase.removeChannel(channel);};},[router,tables]);return null;}
