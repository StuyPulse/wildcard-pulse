"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function LiveRefresh({tables,intervalSeconds=60}:{tables:string[];intervalSeconds?:number}){const router=useRouter();useEffect(()=>{const supabase=createClient();const channel=supabase.channel(`live:${tables.join(':')}`);tables.forEach(table=>channel.on('postgres_changes',{event:'*',schema:'public',table},()=>router.refresh()));channel.subscribe();const interval=window.setInterval(()=>router.refresh(),intervalSeconds*1000);return()=>{supabase.removeChannel(channel);window.clearInterval(interval);};},[router,tables,intervalSeconds]);return null;}
