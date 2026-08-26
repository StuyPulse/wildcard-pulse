"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function signOut() { await createClient().auth.signOut(); window.location.assign("/auth/login"); }
  return <button type="button" className="nav-item" style={{ width: "100%", border: 0, background: "transparent", cursor: "pointer", marginTop: 18 }} onClick={signOut}><LogOut size={17}/><span>Sign out</span></button>;
}
